declare module 'datamaps' {
  interface BubbleData {
    latitude: number;
    longitude: number;
    radius?: number;
    fillKey?: string;
    nodeName?: string;
    fillClass?: string;
  }

  interface DatamapOptions {
    element: HTMLElement;
    scope?: string;
    width?: number;
    height?: number;
    fills?: Record<string, string>;
    geographyConfig?: any;
    bubblesConfig?: any;
    done?: (datamap: Datamap) => void;
  }

  export default class Datamap {
    constructor(options: DatamapOptions);
    bubbles(data: BubbleData[], config?: any): void;
  }
}
