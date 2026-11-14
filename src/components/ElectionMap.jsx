import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { GeoJSON, MapContainer, useMap } from 'react-leaflet';
import { areaName, formatMargin, formatPercent, marginParty } from '../utils/geojsonUtils.js';
import { parties } from '../config/elections.js';
import { featureColor } from '../utils/colorScales.js';

const regions = [
  { key: 'main', label: 'Смежные штаты', bounds: [[24, -125], [50, -66]] },
  { key: 'AK', label: 'Аляска', bounds: [[51, -197], [72, -129]] },
  { key: 'HI', label: 'Гавайи', bounds: [[18.5, -160.9], [22.5, -154.5]] },
];

function alaskaInset(geometry) {
  const move = (coordinates) => typeof coordinates[0] === 'number'
    ? [coordinates[0] > 0 ? coordinates[0] - 360 : coordinates[0], coordinates[1]]
    : coordinates.map(move);
  return { ...geometry, coordinates: move(geometry.coordinates) };
}

function FitRegion({ bounds }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return undefined;
    const fit = () => map.fitBounds(bounds, { padding: [12, 12], animate: false });
    fit();
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container);
    return () => observer.disconnect();
  }, [bounds, map]);
  return null;
}

function MapRegion({ region, features, raceFor, metric, selected, select, view }) {
  const data = useMemo(() => ({
    type: 'FeatureCollection', features: features.filter(({ properties }) => region.key === 'main'
      ? !['AK', 'HI'].includes(properties.code) : properties.code === region.key)
      .map((feature) => region.key === 'AK' ? { ...feature, geometry: alaskaInset(feature.geometry) } : feature),
  }), [features, region.key]);

  const layerRef = useRef(null);
  const tooltipContext = useRef({ raceFor, metric });
  useLayoutEffect(() => {
    tooltipContext.current = { raceFor, metric };
    layerRef.current?.eachLayer((layer) => {
      if (layer.isTooltipOpen()) layer.getTooltip().update();
    });
  }, [raceFor, metric]);

  const style = ({ properties }) => ({
    color: selected === properties.geoid ? '#191c23' : '#fff',
    weight: selected === properties.geoid ? 2.5 : 0.85,
    opacity: 1, fillOpacity: 1, fillColor: featureColor(raceFor(properties.geoid), metric),
  });

  const bind = (feature, layer) => {
    const properties = feature.properties;
    layer.bindTooltip(() => {
      const tooltip = document.createElement('div');
      const title = document.createElement('strong');
      const { raceFor: currentRaceFor, metric: currentMetric } = tooltipContext.current;
      const race = currentRaceFor(properties.geoid);
      const byParty = currentMetric === 'margin';
      const value = byParty ? race?.demMargin : race?.leaderShare;
      const name = byParty ? parties[marginParty(value)] : race?.leader?.name;
      const tie = byParty ? value === 0 : race?.tie;
      title.textContent = areaName(properties);
      const detail = document.createElement('div');
      detail.textContent = name ?? (tie ? 'Равенство голосов' : race?.noBallot
        ? 'Кандидат избран без голосования' : 'Нет данных для этого показателя');
      tooltip.append(title, detail);
      if (value != null) {
        const formatted = document.createElement('div');
        formatted.textContent = byParty ? formatMargin(value) : formatPercent(value);
        tooltip.append(formatted);
      }
      return tooltip;
    }, { sticky: true });
    layer.on({
      click: () => select(properties.geoid),
      mouseover: () => { layer.setStyle({ color: '#222b3a', weight: 2 }); layer.bringToFront(); },
      mouseout: () => {
        const selectedNow = layer.getPane()?.closest('.map-layout')?.dataset.selected === properties.geoid;
        layer.setStyle({ color: selectedNow ? '#191c23' : '#fff', weight: selectedNow ? 2.5 : 0.85 });
      },
    });
  };

  return <MapContainer className={'map map-' + region.key.toLowerCase()} aria-label={region.label}
    bounds={region.bounds} attributionControl={false} zoomControl={region.key === 'main'}
    zoomSnap={0.25} maxZoom={12} scrollWheelZoom={false} dragging={region.key === 'main'}
    doubleClickZoom={region.key === 'main'} touchZoom={region.key === 'main'}
    keyboard={region.key === 'main'} boxZoom={false} zoomAnimation={false}>
    <FitRegion bounds={region.bounds} />
    <GeoJSON key={view} ref={layerRef} data={data} style={style} onEachFeature={bind} />
  </MapContainer>;
}

export default function ElectionMap({ features, raceFor, metric, selected, select, view }) {
  const props = { features, raceFor, metric, selected, select, view };
  return <div className="map-layout" data-selected={selected ?? ''}>
    <MapRegion region={regions[0]} {...props} />
    <div className="insets">
      {regions.slice(1).map((region) => <div key={region.key} className="inset">
        <MapRegion region={region} {...props} />
        <span className="inset-label">{region.label}</span>
      </div>)}
    </div>
  </div>;
}
