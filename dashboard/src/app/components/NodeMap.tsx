'use client';

import React, { useEffect, useRef } from 'react';
import equal from 'fast-deep-equal';
import Datamap from 'datamaps';

interface Node {
  latitude: number;
  longitude: number;
  radius?: number;
  fillKey?: string;
  nodeName?: string;
  fillClass?: string;
}

interface NodeMapProps {
  data: Node[];
}

const NodeMap: React.FC<NodeMapProps> = ({ data }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const dataRef = useRef<Node[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (equal(dataRef.current, data) && mapRef.current) return;

    dataRef.current = data;
    mapContainer.current.innerHTML = '';

    const map = new Datamap({
      element: mapContainer.current,
      scope: 'world',
      fills: {
        defaultFill: 'rgba(71, 85, 105, 0.55)',
        success: '#34d399',
        info: '#22d3ee',
        warning: '#fbbf24',
        orange: '#fb923c',
        danger: '#f87171'
      },
      geographyConfig: {
        borderWidth: 0.6,
        borderColor: 'rgba(148, 163, 184, 0.45)',
        highlightOnHover: false,
        popupOnHover: false,
      },
      bubblesConfig: {
        borderWidth: 1.5,
        borderColor: 'rgba(52, 211, 153, 0.85)',
        popupOnHover: true,
        highlightOnHover: true,
        highlightFillColor: '#6ee7b7',
        highlightBorderColor: '#a7f3d0',
        popupTemplate: function (_: any, geo: any) {
          return `
    <div style="
      background: #0c1220;
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 12px;
    ">
      ${geo.nodeName || 'Unnamed Node'}
    </div>`;
        },
      }
    });

    map.bubbles(data);
    mapRef.current = map;

    const handleResize = () => {
      mapRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  return (
    <div className="chart-panel-map w-full min-w-0 overflow-hidden aspect-[11/5] relative">
      <div
        ref={mapContainer}
        style={{ animation: 'none', transition: 'none' }}
        className="w-full h-full max-w-full"
      />
    </div>
  );
};

export default NodeMap;
