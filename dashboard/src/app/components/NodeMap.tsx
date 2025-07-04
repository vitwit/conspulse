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

  useEffect(() => {
    if (!mapContainer.current) return;

    // Clear previous map
    mapContainer.current.innerHTML = '';

    const map = new Datamap({
      element: mapContainer.current,
      scope: 'world',
      width: 800,
      height: 400,
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
        borderColor: '#333',
        highlightOnHover: false,
        popupOnHover: false
      },
      bubblesConfig: {
        borderWidth: 0,
        popupOnHover: true,
        highlightOnHover: false,
        popupTemplate: function (geo: any, data: any) {
          return `<div class="hoverinfo"><strong>${data.nodeName}</strong></div>`;
        }
      }
    });

    map.bubbles(data);
  }, [data]);

  return <div ref={mapContainer} />;
};

export default NodeMap;
