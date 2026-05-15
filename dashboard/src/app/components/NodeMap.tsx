'use client';

import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!mapContainer.current) return;

    mapContainer.current.innerHTML = '';

    const map = new Datamap({
      element: mapContainer.current,
      scope: 'world',
      fills: {
        defaultFill: '#2b2b2b',
        success: '#7BCC3A',
        info: '#10A0DE',
        warning: '#FFD162',
        orange: '#FF8A00',
        danger: '#F74B4B'
      },
      geographyConfig: {
        borderWidth: 0.5,
        borderColor: '#888',
        highlightOnHover: false,
        popupOnHover: false,
      },
      bubblesConfig: {
        borderWidth: 0,
        popupOnHover: true,
        highlightOnHover: true,
        popupTemplate: function (_: any, data: any) {
          return `
    <div style="
      background: black;
      color: white;
      padding: 4px 8px;
      font-size: 12px;
    ">
      ${data.nodeName || 'Unnamed Node'}
    </div>`;
        },
      }
    });

    map.bubbles(data);
    mapRef.current = map;

    // Resize listener
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  return (
    <div className="w-full aspect-[11/5] relative">
      <div
        ref={mapContainer}
        style={{ animation: 'none', transition: 'none' }}
        className="w-full h-full"
      />
    </div>
  );
};

export default NodeMap;
