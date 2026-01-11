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

// ✨ 노드 타입별 이모지
const NODE_ICONS = {
  issue: '🚨',
  pull_request: '🔀',
  commit: '💬',
  contributor: '👤',
  file: '📄'
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

  // ✨ 개선된 툴팁: 노드 타입별로 상세 정보 표시
  const getNodeLabel = (node) => {
    const icon = NODE_ICONS[node.type] || '⚪';
    const typeLabel = {
      issue: 'Issue',
      pull_request: 'Pull Request',
      commit: 'Commit',
      contributor: 'Contributor',
      file: 'File'
    }[node.type] || `Unknown (${node.type})`;

    // 시간 정보 포맷팅
    const formatDate = (timestamp) => {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      return date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    let info = `${icon} ${typeLabel}\n`;
    info += `${'━'.repeat(20)}\n`;

    switch (node.type) {
      case 'issue':
        info += `📌 ${node.label}: ${node.title}\n`;
        info += `👤 작성자: ${node.author}\n`;
        info += `📅 생성: ${formatDate(node.timestamp)}\n`;
        info += `🏷️ 상태: ${node.state || 'N/A'}`;
        if (node.labels && node.labels.length > 0) {
          info += `\n🔖 라벨: ${node.labels.slice(0, 3).join(', ')}`;
        }
        if (node.z && node.originalZ) {
          const weekDate = new Date(node.z * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
          info += `\n📆 주차: ${weekDate}주`;
          info += `\n⏰ fz: ${node.fz?.toFixed(1)}`;
        }
        break;

      case 'pull_request':
        info += `🔀 ${node.label}: ${node.title}\n`;
        info += `👤 작성자: ${node.author}\n`;
        info += `📅 생성: ${formatDate(node.timestamp)}\n`;
        info += `🏷️ 상태: ${node.state || 'N/A'}`;
        if (node.merged) {
          info += `\n✅ 병합: ${formatDate(node.merged_at)}`;
        }
        if (node.head_branch) {
          info += `\n🌿 ${node.head_branch} → ${node.base_branch}`;
        }
        if (node.z && node.originalZ) {
          const weekDate = new Date(node.z * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
          info += `\n📆 주차: ${weekDate}주`;
          info += `\n⏰ fz: ${node.fz?.toFixed(1)}`;
        }
        break;

      case 'commit':
        info += `💬 ${node.label}\n`;
        info += `📝 ${node.title}\n`;
        info += `👤 작성자: ${node.author}\n`;
        info += `📅 커밋: ${formatDate(node.timestamp)}`;
        if (node.additions !== undefined || node.deletions !== undefined) {
          info += `\n📊 +${node.additions || 0} -${node.deletions || 0}`;
        }
        if (node.z && node.originalZ) {
          const weekDate = new Date(node.z * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
          info += `\n📆 주차: ${weekDate}주`;
          info += `\n⏰ fz: ${node.fz?.toFixed(1)}`;
        }
        break;

      case 'contributor':
        info += `👤 ${node.label}\n`;
        if (node.title && node.title !== node.label) {
          info += `📛 ${node.title}\n`;
        }
        if (node.contributions) {
          info += `📊 기여: ${node.contributions}개`;
        }
        info += `\n⏰ 고정 노드 (시간축 없음)`;
        break;

      case 'file':
        info += `📄 ${node.label}\n`;
        info += `📁 ${node.path}\n`;
        if (node.timestamp) {
          info += `📅 수정: ${formatDate(node.timestamp)}\n`;
        }
        if (node.extension) {
          info += `🏷️ 타입: ${node.extension}\n`;
        }
        if (node.domain) {
          info += `🎯 도메인: ${node.domain}`;
        }
        if (node.lines) {
          info += `\n📏 ${node.lines} 줄`;
        }
        if (node.additions !== undefined || node.deletions !== undefined) {
          info += `\n📊 +${node.additions || 0} -${node.deletions || 0}`;
        }
        if (node.z && node.originalZ) {
          const weekDate = new Date(node.z * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
          info += `\n📆 주차: ${weekDate}주`;
          info += `\n⏰ fz: ${node.fz?.toFixed(1)}`;
        } else if (node.z === 0) {
          info += `\n⏰ Z: 0 (시간축 없음)`;
        }
        break;

      default:
        info += `⚠️ 알 수 없는 타입: ${node.type}\n`;
        info += `ID: ${node.id}\n`;
        info += `Label: ${node.label}\n`;
        info += `Title: ${node.title || 'N/A'}`;
        console.warn('⚠️ 알 수 없는 노드 타입:', node);
    }

    return info;
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
      .nodeLabel(node => getNodeLabel(node))
      .nodeRelSize(6)
      .linkDirectionalArrowLength(3)
      .linkDirectionalArrowRelPos(1)
      .linkDirectionalParticles(2)
      .onNodeClick(node => {
        console.log('🖱️ 클릭한 노드:', node);
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
    
    // ✨ 데이터 검증
    const invalidNodes = data.nodes.filter(n => !n.type || !NODE_COLORS[n.type]);
    if (invalidNodes.length > 0) {
      console.warn('⚠️ 타입이 없거나 정의되지 않은 노드:', invalidNodes);
    }
    
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
          // ✨ 타입 검증
          if (!node.type) {
            console.error('❌ 타입이 없는 노드:', node);
            return '#FF0000';  // 빨간색
          }
          
          // 파일 노드는 도메인 색상 사용
          if (node.type === 'file' && node.domain) {
            return DOMAIN_COLORS[node.domain] || NODE_COLORS.file;
          }
          
          if (!NODE_COLORS[node.type]) {
            console.error(`❌ 정의되지 않은 타입: ${node.type}`, node);
            return '#FF6B6B';  // 주황색
          }
          
          return NODE_COLORS[node.type];
        })
        .linkColor(() => '#021550')
        .linkOpacity(0.2)
        .linkWidth(1);
    }
  }, [selectedContributor, selectedDomain, data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}