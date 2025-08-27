'use client';
import React, { useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

interface CrawledPage {
  url: string;
  found_links?: string[];
}

interface SiteVisualizerProps {
  results: CrawledPage[];
  startUrl: string;
}

const SiteVisualizer: React.FC<SiteVisualizerProps> = ({ results, startUrl }) => {
  const graphData = useMemo(() => {
    if (!results || results.length === 0) {
      return { nodes: [], links: [] };
    }

    const nodes = results.map(page => ({
      id: page.url,
      name: page.url.replace(startUrl, '') || '/', // Show root as '/'
      val: 1, // Node size
    }));

    const links: { source: string; target: string }[] = [];
    results.forEach(page => {
      if (page.found_links) {
        page.found_links.forEach(link => {
          // Ensure the target link is also a node in our graph
          if (results.some(p => p.url === link)) {
            links.push({
              source: page.url,
              target: link,
            });
          }
        });
      }
    });

    return { nodes, links };
  }, [results, startUrl]);

  if (typeof window === 'undefined') {
    return <div>Loading visualization...</div>;
  }

  return (
    <ForceGraph2D
      graphData={graphData}
      nodeLabel="name"
      nodeAutoColorBy="id"
      linkDirectionalArrowLength={3.5}
      linkDirectionalArrowRelPos={1}
      width={800} // You might want to make this responsive
      height={600}
    />
  );
};

export default SiteVisualizer;
