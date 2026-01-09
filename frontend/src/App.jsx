import { useEffect, useState } from 'react';
import GraphView from './components/GraphView';
import Legend from './components/Legend';
import ControlPanel from './components/ControlPanel';

export default function App() {
  const [status, setStatus] = useState('loading');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedContributor, setSelectedContributor] = useState(null);
  const [viewMode, setViewMode] = useState('all');

  useEffect(() => {
    fetch('http://localhost:8000/api/demo')
      .then(res => res.json())
      .then(data => {
        const zValues = data.nodes.map(n => n.z);
        const minZ = Math.min(...zValues), maxZ = Math.max(...zValues);
        const range = maxZ - minZ || 1;

        const normalizedNodes = data.nodes.map(node => ({
          ...node,
          fz: ((node.z - minZ) / range) * 200,
          baseZ: ((node.z - minZ) / range) * 200
        }));

        setGraphData({ nodes: normalizedNodes, links: data.edges });
        setStatus('loaded');
      })
      .catch(err => {
        console.error(err);
        setStatus('error');
      });
  }, []);

  const contributors = graphData.nodes.filter(n => n.type === 'contributor');

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* UI 컴포넌트 */}
      <Legend status={status} />
      
      <ControlPanel 
        viewMode={viewMode}
        setViewMode={setViewMode}
        contributors={contributors}
        selectedContributor={selectedContributor}
        onContributorSelect={setSelectedContributor}
      />

      {/* 그래프 시각화 엔진 */}
      <GraphView 
        data={graphData} 
        selectedContributor={selectedContributor} 
        onContributorClick={setSelectedContributor}
      />
    </div>
  );
}