import { useEffect, useRef, useState } from 'react'
import ForceGraph3D from '3d-force-graph'
import * as THREE from 'three'

const NODE_COLORS = {
  issue: '#f85149',
  pull_request: '#a371f7',
  commit: '#3fb950',
  contributor: '#e3b341',
  file: '#1f6feb'
}

// 축 라벨(텍스트) 생성을 위한 보조 함수
const createTextLabel = (text, position, color = '#021550') => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;
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

export default function App() {
  const containerRef = useRef(null)
  const graphRef = useRef(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    // 1. 그래프 인스턴스 초기 생성
    const graph = ForceGraph3D()(containerRef.current)
      .backgroundColor('#f9fafaff') // 밝은 배경
      .nodeLabel(node => `${node.label}: ${node.title || ''}\nby ${node.author}`)
      .nodeColor(node => NODE_COLORS[node.type] || '#888')
      .nodeRelSize(6)
      .linkColor(() => '#021550')
      .linkOpacity(0.2)
      .linkDirectionalArrowLength(3)
      .linkDirectionalArrowRelPos(1)
      .linkDirectionalParticles(2)
      .linkDirectionalParticleSpeed(0.005);

    graphRef.current = graph;

    // 2. 데이터 페칭 및 정규화
    fetch('http://localhost:8000/api/demo')
      .then(res => res.json())
      .then(data => {
        const zValues = data.nodes.map(n => n.z);
        const minZ = Math.min(...zValues);
        const maxZ = Math.max(...zValues);
        const range = maxZ - minZ || 1;

        const normalizedNodes = data.nodes.map(node => {
          const fixedZ = ((node.z - minZ) / range) * 200;
          return {
            ...node,
            fz: fixedZ,      // 시뮬레이션에서 고정될 Z 좌표
            baseZ: fixedZ    // 드래그 시 참조할 원본 Z 값 저장
          };
        });

        // 데이터 주입
        graph.graphData({ nodes: normalizedNodes, links: data.edges });

        graph.onNodeDrag((node) => {
          node.fz = node.baseZ; // 드래그 중에도 강제로 원본 높이 유지
        })
          .onNodeDragEnd((node) => {
            node.fz = node.baseZ; // 드래그가 끝나도 높이 고정 유지
          });

        // 3. 씬 커스텀 (축 및 라벨 추가)
        const scene = graph.scene();
        const axisLength = 250;
        const axisColor = '#021550'; // 배경에 대비되는 어두운 색

        // 기존 커스텀 오브젝트 제거
        scene.children = scene.children.filter(obj => !obj.isCustomAxis);

        // 축 선 생성 (Line)
        const lineMat = new THREE.LineBasicMaterial({ color: axisColor });

        // X축
        const xGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(axisLength, 0, 0)]);
        const xAxis = new THREE.Line(xGeom, lineMat); xAxis.isCustomAxis = true;
        scene.add(xAxis);

        // Y축
        const yGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axisLength, 0)]);
        const yAxis = new THREE.Line(yGeom, lineMat); yAxis.isCustomAxis = true;
        scene.add(yAxis);

        // Z축 (Time)
        const zGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLength)]);
        const zAxis = new THREE.Line(zGeom, lineMat); zAxis.isCustomAxis = true;
        scene.add(zAxis);

        // 축 이름 라벨 추가
        const xLabel = createTextLabel('X-Axis', [axisLength + 20, 0, 0], axisColor); xLabel.isCustomAxis = true;
        const yLabel = createTextLabel('Y-Axis', [0, axisLength + 20, 0], axisColor); yLabel.isCustomAxis = true;
        const zLabel = createTextLabel('Time (Z)', [0, 0, axisLength + 20], '#f85149'); zLabel.isCustomAxis = true; // 시간축만 강조

        scene.add(xLabel);
        scene.add(yLabel);
        scene.add(zLabel);

        // 바닥 그리드 (Z=0 기점)
        const grid = new THREE.GridHelper(400, 20, 0xcccccc, 0xeeeeee);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = 0;
        grid.isCustomAxis = true;
        scene.add(grid);

        setStatus('loaded');

        // 4. 카메라 시점 조정 (시간축이 잘 보이도록 비스듬한 쿼터뷰)
        setTimeout(() => {
          graph.cameraPosition(
            { x: 300, y: 300, z: 400 }, // 카메라 위치
            { x: 0, y: 0, z: 100 },     // 원점보다 약간 위를 바라봄
            1000
          );
        }, 200);
      })
      .catch(err => {
        console.error(err);
        setStatus('error');
      });

    const handleResize = () => {
      graph.width(window.innerWidth).height(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (graphRef.current) graphRef.current._destructor?.();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f9fafaff' }}>
      
      {/* 1. 노드 카테고리 범례 (상단 왼쪽에 배치) */}
      <div style={{ 
        position: 'absolute', 
        top: 16, 
        left: 16, 
        zIndex: 10, 
        padding: '16px', 
        background: 'rgba(255,255,255,0.9)', 
        borderRadius: 12, 
        border: '1px solid #d0d7de', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        minWidth: '180px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#021550', borderBottom: '1px solid #eee', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🔍 T-Graph 카테고리
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <LegendItem color={NODE_COLORS.contributor} emoji="👤" label="기여자 (Contributor)" />
          <LegendItem color={NODE_COLORS.file} emoji="📄" label="파일 (File)" />
          <LegendItem color={NODE_COLORS.issue} emoji="🚨" label="이슈 (Issue)" />
          <LegendItem color={NODE_COLORS.pull_request} emoji="🔍" label="PR (Pull Request)" />
          <LegendItem color={NODE_COLORS.commit} emoji="💬" label="커밋 (Commit)" />
        </div>
        
        {/* 상태 표시를 범례 하단에 작게 통합 (선택 사항) */}
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #eee', fontSize: '10px', color: status === 'error' ? '#f85149' : '#8b949e' }}>
          {status === 'loading' && '⏳ 데이터 로드 중...'}
          {status === 'loaded' && '● 시스템 정상 작동 중'}
          {status === 'error' && '● 연결 오류 발생'}
        </div>
      </div>

      {/* 2. 그래프 컨테이너 */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

/**
 * 범례 아이템 컴포넌트
 */
function LegendItem({ color, emoji, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#24292f' }}>
      <div style={{ 
        width: '10px', 
        height: '10px', 
        borderRadius: '50%', 
        background: color, 
        border: '1px solid rgba(0,0,0,0.1)' 
      }} />
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {emoji} {label}
      </span>
    </div>
  );
}