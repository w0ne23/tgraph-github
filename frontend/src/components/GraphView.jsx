import { useEffect, useRef } from 'react';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';

const NODE_COLORS = {
  issue: '#f85149', 
  pull_request: '#a371f7', 
  commit: '#3fb950', 
  contributor: '#e3b341', 
  file: '#1f6feb'
};

const DOMAIN_COLORS = {
  backend_api: '#FF6B6B',
  frontend_ui: '#4ECDC4',
  database: '#45B7D1',
  visualization: '#FFA07A',
  authentication: '#98D8C8',
  uncategorized: '#95A5A6'
};

export default function GraphView({ data, selectedContributor, selectedDomain, onContributorClick }) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);

  const createTextLabel = (text, position, color = '#021550') => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256; canvas.height = 128;
    context.font = 'Bold 50px Arial';
    context.fillStyle = color;
    context.textAlign = 'center';
    context.fillText(text, 128, 80);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(...position);
    sprite.scale.set(40, 20, 1);
    return sprite;
  };

  const getRelatedNodeIds = (contributorId, graphData) => {
    if (!contributorId) return new Set();
    const related = new Set([contributorId]);
    const queue = [{ id: contributorId, depth: 0 }];
    const visited = new Set();
    const maxDepth = 2;
    
    while (queue.length > 0) {
      const { id: currentId, depth } = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      if (depth >= maxDepth) continue;
      
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sourceId === currentId && !visited.has(targetId)) {
          related.add(targetId);
          queue.push({ id: targetId, depth: depth + 1 });
        }
      });
    }
    return related;
  };

  // 1. 그래프 초기화
  useEffect(() => {
    const graph = ForceGraph3D()(containerRef.current)
      .backgroundColor('#f9fafaff')
      .nodeLabel(node => `${node.label}: ${node.title || ''}\nby ${node.author}`)
      .nodeRelSize(6)
      .linkDirectionalArrowLength(3)
      .linkDirectionalArrowRelPos(1)
      .linkDirectionalParticles(2)
      .onNodeClick(node => {
        if (node.type === 'contributor') onContributorClick(node.id);
      });

    graphRef.current = graph;

    const handleResize = () => graph.width(window.innerWidth).height(window.innerHeight);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (graphRef.current) graphRef.current._destructor?.();
    };
  }, []);

  // 2. 데이터 업데이트
  useEffect(() => {
    if (!graphRef.current || !data.nodes.length) return;

    const graph = graphRef.current;
    graph.graphData(data);

    graph.onNodeDrag(node => { node.fz = node.baseZ; })
         .onNodeDragEnd(node => { node.fz = node.baseZ; });

    const scene = graph.scene();
    const toRemove = scene.children.filter(obj => obj.isCustomAxis);
    toRemove.forEach(obj => scene.remove(obj));

    const axisLength = 250;
    const lineMat = new THREE.LineBasicMaterial({ color: '#021550' });
    
    const axes = [
      { pts: [new THREE.Vector3(0,0,0), new THREE.Vector3(axisLength,0,0)], label: 'X-Axis', pos: [axisLength+20, 0, 0] },
      { pts: [new THREE.Vector3(0,0,0), new THREE.Vector3(0,axisLength,0)], label: 'Y-Axis', pos: [0, axisLength+20, 0] },
      { pts: [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,axisLength)], label: 'Time (Z)', pos: [0, 0, axisLength+20], color: '#f85149' }
    ];

    axes.forEach(a => {
      const geom = new THREE.BufferGeometry().setFromPoints(a.pts);
      const line = new THREE.Line(geom, lineMat);
      line.isCustomAxis = true;
      scene.add(line);
      const lbl = createTextLabel(a.label, a.pos, a.color || '#021550');
      lbl.isCustomAxis = true;
      scene.add(lbl);
    });

    const grid = new THREE.GridHelper(400, 20, 0xcccccc, 0xeeeeee);
    grid.rotation.x = Math.PI / 2;
    grid.isCustomAxis = true;
    scene.add(grid);

    setTimeout(() => {
      graph.cameraPosition({ x: 300, y: 300, z: 400 }, { x: 0, y: 0, z: 100 }, 1000);
    }, 200);
  }, [data]);

  // 3. 필터링 로직 (기여자 + 도메인)
  useEffect(() => {
    if (!graphRef.current || !data.nodes.length) return;

    const graph = graphRef.current;
    const relatedIds = selectedContributor ? getRelatedNodeIds(selectedContributor, data) : new Set();

    // 기여자 필터링이 활성화된 경우
    if (selectedContributor) {
      graph
        .nodeColor(node => relatedIds.has(node.id) ? (NODE_COLORS[node.type] || '#888') : '#f5f5f5')
        .linkColor(link => {
          const s = typeof link.source === 'object' ? link.source.id : link.source;
          const t = typeof link.target === 'object' ? link.target.id : link.target;
          return (relatedIds.has(s) && relatedIds.has(t)) ? '#021550' : '#f8f8f8';
        })
        .linkWidth(link => {
          const s = typeof link.source === 'object' ? link.source.id : link.source;
          const t = typeof link.target === 'object' ? link.target.id : link.target;
          return (relatedIds.has(s) && relatedIds.has(t)) ? 2.5 : 0.2;
        })
        .linkOpacity(link => {
          const s = typeof link.source === 'object' ? link.source.id : link.source;
          const t = typeof link.target === 'object' ? link.target.id : link.target;
          return (relatedIds.has(s) && relatedIds.has(t)) ? 0.7 : 0.08;
        });
    }
    // 도메인 필터링이 활성화된 경우
    else if (selectedDomain) {
      graph
        .nodeColor(node => {
          // 파일 노드는 도메인별 색상, 해당 도메인이면 강조
          if (node.type === 'file') {
            return node.domain === selectedDomain 
              ? (DOMAIN_COLORS[node.domain] || NODE_COLORS.file)
              : '#e0e0e0';
          }
          // 다른 노드는 희미하게
          return '#e0e0e0';
        })
        .linkOpacity(0.1);
    }
    // 전체 모드
    else {
      graph
        .nodeColor(node => {
          // 파일 노드는 도메인 색상 사용
          if (node.type === 'file' && node.domain) {
            return DOMAIN_COLORS[node.domain] || NODE_COLORS.file;
          }
          return NODE_COLORS[node.type] || '#888';
        })
        .linkColor(() => '#021550')
        .linkOpacity(0.2)
        .linkWidth(1);
    }
  }, [selectedContributor, selectedDomain, data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}