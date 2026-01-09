// import { useEffect, useRef, useState } from 'react'
// import ForceGraph3D from '3d-force-graph'
// import * as THREE from 'three'

// const NODE_COLORS = {
//   issue: '#f85149',
//   pull_request: '#a371f7',
//   commit: '#3fb950',
//   contributor: '#e3b341',
//   file: '#1f6feb'
// }

// // 축 라벨(텍스트) 생성을 위한 보조 함수
// const createTextLabel = (text, position, color = '#021550') => {
//   const canvas = document.createElement('canvas');
//   const context = canvas.getContext('2d');
//   canvas.width = 256;
//   canvas.height = 128;
//   context.font = 'Bold 50px Arial';
//   context.fillStyle = color;
//   context.textAlign = 'center';
//   context.fillText(text, 128, 80);

//   const texture = new THREE.CanvasTexture(canvas);
//   const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
//   const sprite = new THREE.Sprite(spriteMaterial);
//   sprite.position.set(...position);
//   sprite.scale.set(40, 20, 1);
//   return sprite;
// };

// export default function App() {
//   const containerRef = useRef(null)
//   const graphRef = useRef(null)
//   const [status, setStatus] = useState('loading')
//   const [graphData, setGraphData] = useState({ nodes: [], links: [] })
//   const [selectedContributor, setSelectedContributor] = useState(null)
//   const [viewMode, setViewMode] = useState('all')
  
//   // BFS 결과 캐싱
//   const relatedIdsRef = useRef(new Set())

//   // 선택된 기여자와 관련된 노드 ID들을 찾는 함수 (BFS)
//   const getRelatedNodeIds = (contributorId, data) => {
//     if (!contributorId) return new Set()
    
//     const related = new Set([contributorId])
//     const visited = new Set()
//     const queue = [contributorId]
    
//     while (queue.length > 0) {
//       const currentId = queue.shift()
//       if (visited.has(currentId)) continue
//       visited.add(currentId)
      
//       data.links.forEach(link => {
//         const sourceId = typeof link.source === 'object' ? link.source.id : link.source
//         const targetId = typeof link.target === 'object' ? link.target.id : link.target
        
//         if (sourceId === currentId && !visited.has(targetId)) {
//           related.add(targetId)
//           queue.push(targetId)
//         }
//         if (targetId === currentId && !visited.has(sourceId)) {
//           related.add(sourceId)
//           queue.push(sourceId)
//         }
//       })
//     }
    
//     return related
//   }

//   useEffect(() => {
//     // 1. 그래프 인스턴스 초기 생성 - 원래 작동하던 방식
//     const graph = ForceGraph3D()(containerRef.current)
//       .backgroundColor('#f9fafaff')
//       .nodeLabel(node => `${node.label}: ${node.title || ''}\nby ${node.author}`)
//       .nodeColor(node => NODE_COLORS[node.type] || '#888')
//       .nodeRelSize(6)
//       .linkColor(() => '#021550')
//       .linkOpacity(0.2)
//       .linkDirectionalArrowLength(3)
//       .linkDirectionalArrowRelPos(1)
//       .linkDirectionalParticles(2)
//       .linkDirectionalParticleSpeed(0.005)
//       .onNodeClick((node) => {
//         if (node.type === 'contributor') {
//           setSelectedContributor(prev => prev === node.id ? null : node.id)
//         }
//       });

//     graphRef.current = graph;

//     // 2. 데이터 페칭 및 정규화
//     fetch('http://localhost:8000/api/demo')
//       .then(res => res.json())
//       .then(data => {
//         const zValues = data.nodes.map(n => n.z);
//         const minZ = Math.min(...zValues);
//         const maxZ = Math.max(...zValues);
//         const range = maxZ - minZ || 1; // 0 방지

//         const normalizedNodes = data.nodes.map(node => {
//           const fixedZ = ((node.z - minZ) / range) * 200;
//           return {
//             ...node,
//             fz: fixedZ,
//             baseZ: fixedZ
//           };
//         });

//         // 데이터 저장
//         const processedData = { nodes: normalizedNodes, links: data.edges };
//         setGraphData(processedData);

//         // 데이터 주입
//         graph.graphData(processedData);

//         graph.onNodeDrag((node) => {
//           node.fz = node.baseZ;
//         })
//           .onNodeDragEnd((node) => {
//             node.fz = node.baseZ;
//           });

//         // 3. 씬 커스텀 (축 및 라벨 추가)
//         const scene = graph.scene();
//         const axisLength = 250;
//         const axisColor = '#021550';

//         // 안전하게 커스텀 축 제거
//         const toRemove = scene.children.filter(obj => obj.isCustomAxis);
//         toRemove.forEach(obj => scene.remove(obj));

//         // 축 선 생성 (Line)
//         const lineMat = new THREE.LineBasicMaterial({ color: axisColor });

//         // X축
//         const xGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(axisLength, 0, 0)]);
//         const xAxis = new THREE.Line(xGeom, lineMat); xAxis.isCustomAxis = true;
//         scene.add(xAxis);

//         // Y축
//         const yGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axisLength, 0)]);
//         const yAxis = new THREE.Line(yGeom, lineMat); yAxis.isCustomAxis = true;
//         scene.add(yAxis);

//         // Z축 (Time)
//         const zGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLength)]);
//         const zAxis = new THREE.Line(zGeom, lineMat); zAxis.isCustomAxis = true;
//         scene.add(zAxis);

//         // 축 이름 라벨 추가
//         const xLabel = createTextLabel('X-Axis', [axisLength + 20, 0, 0], axisColor); xLabel.isCustomAxis = true;
//         const yLabel = createTextLabel('Y-Axis', [0, axisLength + 20, 0], axisColor); yLabel.isCustomAxis = true;
//         const zLabel = createTextLabel('Time (Z)', [0, 0, axisLength + 20], '#f85149'); zLabel.isCustomAxis = true;

//         scene.add(xLabel);
//         scene.add(yLabel);
//         scene.add(zLabel);

//         // 바닥 그리드 (Z=0 기준)
//         const grid = new THREE.GridHelper(400, 20, 0xcccccc, 0xeeeeee);
//         grid.rotation.x = Math.PI / 2;
//         grid.position.z = 0;
//         grid.isCustomAxis = true;
//         scene.add(grid);

//         setStatus('loaded');

//         // 4. 카메라 시점 조정
//         setTimeout(() => {
//           graph.cameraPosition(
//             { x: 300, y: 300, z: 400 },
//             { x: 0, y: 0, z: 100 },
//             1000
//           );
//         }, 200);
//       })
//       .catch(err => {
//         console.error(err);
//         setStatus('error');
//       });

//     const handleResize = () => {
//       graph.width(window.innerWidth).height(window.innerHeight);
//     };
//     window.addEventListener('resize', handleResize);

//     return () => {
//       window.removeEventListener('resize', handleResize);
//       if (graphRef.current) graphRef.current._destructor?.();
//     };
//   }, []);

//   // 선택된 기여자가 변경될 때 BFS 실행 및 색상 업데이트
//   useEffect(() => {
//     if (!graphRef.current || graphData.nodes.length === 0) return;

//     // BFS 결과를 미리 계산하여 캐싱
//     const relatedIds = selectedContributor 
//       ? getRelatedNodeIds(selectedContributor, graphData)
//       : new Set();
    
//     relatedIdsRef.current = relatedIds;

//     if (selectedContributor) {
//       // 필터링 모드 - 색상 대비 극대화 (크기 조절 제거)
//       graphRef.current
//         .nodeColor(node => {
//           // 관련 노드: 원래 선명한 색상, 무관한 노드: 배경색과 거의 같은 아주 연한 회색
//           return relatedIds.has(node.id) ? (NODE_COLORS[node.type] || '#888') : '#f5f5f5';
//         })
//         .linkColor(link => {
//           const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
//           const targetId = typeof link.target === 'object' ? link.target.id : link.target;
//           // 관련 엣지: 검은색에 가까운 진한 파랑, 무관한 엣지: 거의 보이지 않는 회색
//           return (relatedIds.has(sourceId) && relatedIds.has(targetId)) ? '#021550' : '#f8f8f8';
//         })
//         .linkWidth(link => {
//           const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
//           const targetId = typeof link.target === 'object' ? link.target.id : link.target;
//           // 관련 엣지: 매우 굵게, 무관한 엣지: 거의 보이지 않게
//           return (relatedIds.has(sourceId) && relatedIds.has(targetId)) ? 2.5 : 0.2;
//         })
//         .linkOpacity(link => {
//           const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
//           const targetId = typeof link.target === 'object' ? link.target.id : link.target;
//           // 관련 엣지: 완전 선명, 무관한 엣지: 거의 투명
//           return (relatedIds.has(sourceId) && relatedIds.has(targetId)) ? 0.7 : 0.08;
//         });
//     } else {
//       // 전체 모드 (원래대로 복원)
//       graphRef.current
//         .nodeColor(node => NODE_COLORS[node.type] || '#888')
//         .linkColor(() => '#021550')
//         .linkOpacity(0.2)
//         .linkWidth(1);
//     }

//   }, [selectedContributor, graphData]);

//   // 뷰 모드 변경 핸들러
//   const handleViewModeChange = (mode) => {
//     setViewMode(mode);
//     if (mode === 'all') {
//       setSelectedContributor(null);
//     }
//   };

//   // 기여자 목록 추출
//   const contributors = graphData.nodes.filter(n => n.type === 'contributor');

//   return (
//     <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f9fafaff' }}>
      
//       {/* 1. 노드 카테고리 범례 (상단 왼쪽에 배치) */}
//       <div style={{ 
//         position: 'absolute', 
//         top: 16, 
//         left: 16, 
//         zIndex: 10, 
//         padding: '16px', 
//         background: 'rgba(255,255,255,0.95)', 
//         borderRadius: 12, 
//         border: '1px solid #d0d7de', 
//         boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//         minWidth: '180px'
//       }}>
//         <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#021550', borderBottom: '1px solid #eee', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
//           🔍 T-Graph 카테고리
//         </h4>
//         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
//           <LegendItem color={NODE_COLORS.contributor} emoji="👤" label="기여자 (Contributor)" />
//           <LegendItem color={NODE_COLORS.file} emoji="📄" label="파일 (File)" />
//           <LegendItem color={NODE_COLORS.issue} emoji="🚨" label="이슈 (Issue)" />
//           <LegendItem color={NODE_COLORS.pull_request} emoji="🔀" label="PR (Pull Request)" />
//           <LegendItem color={NODE_COLORS.commit} emoji="💬" label="커밋 (Commit)" />
//         </div>
        
//         <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #eee', fontSize: '10px', color: status === 'error' ? '#f85149' : '#8b949e' }}>
//           {status === 'loading' && '⏳ 데이터 로드 중...'}
//           {status === 'loaded' && '✓ 시스템 정상 작동 중'}
//           {status === 'error' && '✗ 연결 오류 발생'}
//         </div>
//       </div>

//       {/* 2. 뷰 모드 및 필터 컨트롤 (상단 오른쪽) */}
//       <div style={{ 
//         position: 'absolute', 
//         top: 16, 
//         right: 16, 
//         zIndex: 10, 
//         padding: '16px', 
//         background: 'rgba(255,255,255,0.95)', 
//         borderRadius: 12, 
//         border: '1px solid #d0d7de', 
//         boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//         minWidth: '260px'
//       }}>
//         <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#021550', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
//           🎯 뷰 모드
//         </h4>
        
//         {/* 뷰 모드 버튼 */}
//         <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
//           <button
//             onClick={() => handleViewModeChange('all')}
//             style={{
//               flex: 1,
//               padding: '8px 12px',
//               fontSize: '12px',
//               borderRadius: '6px',
//               border: viewMode === 'all' ? '2px solid #0969da' : '1px solid #d0d7de',
//               background: viewMode === 'all' ? '#ddf4ff' : 'white',
//               color: viewMode === 'all' ? '#0969da' : '#24292f',
//               cursor: 'pointer',
//               fontWeight: viewMode === 'all' ? 'bold' : 'normal',
//               transition: 'all 0.2s'
//             }}
//           >
//             🌐 전체 뷰
//           </button>
//           <button
//             onClick={() => handleViewModeChange('contributor-focused')}
//             style={{
//               flex: 1,
//               padding: '8px 12px',
//               fontSize: '12px',
//               borderRadius: '6px',
//               border: viewMode === 'contributor-focused' ? '2px solid #0969da' : '1px solid #d0d7de',
//               background: viewMode === 'contributor-focused' ? '#ddf4ff' : 'white',
//               color: viewMode === 'contributor-focused' ? '#0969da' : '#24292f',
//               cursor: 'pointer',
//               fontWeight: viewMode === 'contributor-focused' ? 'bold' : 'normal',
//               transition: 'all 0.2s'
//             }}
//           >
//             👥 기여자 중심
//           </button>
//         </div>

//         {/* 기여자 중심 뷰일 때만 기여자 목록 표시 */}
//         {viewMode === 'contributor-focused' && (
//           <>
//             <h4 style={{ margin: '0 0 8px 0', fontSize: 12, color: '#57606a' }}>
//               기여자 선택 (클릭하여 필터링)
//             </h4>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
//               {contributors.map(contributor => (
//                 <button
//                   key={contributor.id}
//                   onClick={() => setSelectedContributor(prev => prev === contributor.id ? null : contributor.id)}
//                   style={{
//                     padding: '8px 12px',
//                     fontSize: '12px',
//                     borderRadius: '6px',
//                     border: selectedContributor === contributor.id ? '2px solid #e3b341' : '1px solid #d0d7de',
//                     background: selectedContributor === contributor.id ? '#fff8e6' : 'white',
//                     color: '#24292f',
//                     cursor: 'pointer',
//                     textAlign: 'left',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '8px',
//                     transition: 'all 0.2s'
//                   }}
//                 >
//                   <div style={{ 
//                     width: '10px', 
//                     height: '10px', 
//                     borderRadius: '50%', 
//                     background: NODE_COLORS.contributor 
//                   }} />
//                   <span style={{ fontWeight: selectedContributor === contributor.id ? 'bold' : 'normal' }}>
//                     {contributor.label}
//                   </span>
//                   {selectedContributor === contributor.id && <span style={{ marginLeft: 'auto', color: '#e3b341' }}>✓</span>}
//                 </button>
//               ))}
//             </div>
            
//             {selectedContributor && (
//               <div style={{ 
//                 marginTop: '12px', 
//                 padding: '8px', 
//                 background: '#fff8e6', 
//                 borderRadius: '6px',
//                 fontSize: '11px',
//                 color: '#6f4e1e'
//               }}>
//                 💡 선택한 기여자와 연결된 작업만 강조 표시됩니다
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* 3. 그래프 컨테이너 */}
//       <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
//     </div>
//   );
// }

// /**
//  * 범례 아이템 컴포넌트
//  */
// function LegendItem({ color, emoji, label }) {
//   return (
//     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#24292f' }}>
//       <div style={{ 
//         width: '10px', 
//         height: '10px', 
//         borderRadius: '50%', 
//         background: color, 
//         border: '1px solid rgba(0,0,0,0.1)' 
//       }} />
//       <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
//         {emoji} {label}
//       </span>
//     </div>
//   );
// }

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
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [selectedContributor, setSelectedContributor] = useState(null)
  const [viewMode, setViewMode] = useState('all')
  
  // BFS 결과 캐싱
  const relatedIdsRef = useRef(new Set())

  // 선택된 기여자와 관련된 노드 ID들을 찾는 함수 (깊이 제한 BFS)
  const getRelatedNodeIds = (contributorId, data) => {
    if (!contributorId) return new Set()
    
    const related = new Set([contributorId])
    const queue = [{ id: contributorId, depth: 0 }] // depth 추가
    const visited = new Set()
    const maxDepth = 2 // 기여자(0) → 작업물(1) → 파일(2)
    
    while (queue.length > 0) {
      const { id: currentId, depth } = queue.shift()
      
      if (visited.has(currentId)) continue
      visited.add(currentId)
      
      // 최대 깊이를 넘으면 더 이상 탐색하지 않음
      if (depth >= maxDepth) continue
      
      data.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source
        const targetId = typeof link.target === 'object' ? link.target.id : link.target
        
        // 현재 노드에서 나가는 엣지만 탐색 (단방향)
        if (sourceId === currentId && !visited.has(targetId)) {
          related.add(targetId)
          queue.push({ id: targetId, depth: depth + 1 })
        }
      })
    }
    
    return related
  }

  useEffect(() => {
    // 1. 그래프 인스턴스 초기 생성 - 원래 작동하던 방식
    const graph = ForceGraph3D()(containerRef.current)
      .backgroundColor('#f9fafaff')
      .nodeLabel(node => `${node.label}: ${node.title || ''}\nby ${node.author}`)
      .nodeColor(node => NODE_COLORS[node.type] || '#888')
      .nodeRelSize(6)
      .linkColor(() => '#021550')
      .linkOpacity(0.2)
      .linkDirectionalArrowLength(3)
      .linkDirectionalArrowRelPos(1)
      .linkDirectionalParticles(2)
      .linkDirectionalParticleSpeed(0.005)
      .onNodeClick((node) => {
        if (node.type === 'contributor') {
          setSelectedContributor(prev => prev === node.id ? null : node.id)
        }
      });

    graphRef.current = graph;

    // 2. 데이터 페칭 및 정규화
    fetch('http://localhost:8000/api/demo')
      .then(res => res.json())
      .then(data => {
        const zValues = data.nodes.map(n => n.z);
        const minZ = Math.min(...zValues);
        const maxZ = Math.max(...zValues);
        const range = maxZ - minZ || 1; // 0 방지

        const normalizedNodes = data.nodes.map(node => {
          const fixedZ = ((node.z - minZ) / range) * 200;
          return {
            ...node,
            fz: fixedZ,
            baseZ: fixedZ
          };
        });

        // 데이터 저장
        const processedData = { nodes: normalizedNodes, links: data.edges };
        setGraphData(processedData);

        // 데이터 주입
        graph.graphData(processedData);

        graph.onNodeDrag((node) => {
          node.fz = node.baseZ;
        })
          .onNodeDragEnd((node) => {
            node.fz = node.baseZ;
          });

        // 3. 씬 커스텀 (축 및 라벨 추가)
        const scene = graph.scene();
        const axisLength = 250;
        const axisColor = '#021550';

        // 안전하게 커스텀 축 제거
        const toRemove = scene.children.filter(obj => obj.isCustomAxis);
        toRemove.forEach(obj => scene.remove(obj));

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
        const zLabel = createTextLabel('Time (Z)', [0, 0, axisLength + 20], '#f85149'); zLabel.isCustomAxis = true;

        scene.add(xLabel);
        scene.add(yLabel);
        scene.add(zLabel);

        // 바닥 그리드 (Z=0 기준)
        const grid = new THREE.GridHelper(400, 20, 0xcccccc, 0xeeeeee);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = 0;
        grid.isCustomAxis = true;
        scene.add(grid);

        setStatus('loaded');

        // 4. 카메라 시점 조정
        setTimeout(() => {
          graph.cameraPosition(
            { x: 300, y: 300, z: 400 },
            { x: 0, y: 0, z: 100 },
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

  // 선택된 기여자가 변경될 때 BFS 실행 및 색상 업데이트
  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return;

    // BFS 결과를 미리 계산하여 캐싱
    const relatedIds = selectedContributor 
      ? getRelatedNodeIds(selectedContributor, graphData)
      : new Set();
    
    relatedIdsRef.current = relatedIds;

    if (selectedContributor) {
      // 필터링 모드 - 색상 대비 극대화 (크기 조절 제거)
      graphRef.current
        .nodeColor(node => {
          // 관련 노드: 원래 선명한 색상, 무관한 노드: 배경색과 거의 같은 아주 연한 회색
          return relatedIds.has(node.id) ? (NODE_COLORS[node.type] || '#888') : '#f5f5f5';
        })
        .linkColor(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          // 관련 엣지: 검은색에 가까운 진한 파랑, 무관한 엣지: 거의 보이지 않는 회색
          return (relatedIds.has(sourceId) && relatedIds.has(targetId)) ? '#021550' : '#f8f8f8';
        })
        .linkWidth(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          // 관련 엣지: 매우 굵게, 무관한 엣지: 거의 보이지 않게
          return (relatedIds.has(sourceId) && relatedIds.has(targetId)) ? 2.5 : 0.2;
        })
        .linkOpacity(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          // 관련 엣지: 완전 선명, 무관한 엣지: 거의 투명
          return (relatedIds.has(sourceId) && relatedIds.has(targetId)) ? 0.7 : 0.08;
        });
    } else {
      // 전체 모드 (원래대로 복원)
      graphRef.current
        .nodeColor(node => NODE_COLORS[node.type] || '#888')
        .linkColor(() => '#021550')
        .linkOpacity(0.2)
        .linkWidth(1);
    }

  }, [selectedContributor, graphData]);

  // 뷰 모드 변경 핸들러
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'all') {
      setSelectedContributor(null);
    }
  };

  // 기여자 목록 추출
  const contributors = graphData.nodes.filter(n => n.type === 'contributor');

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f9fafaff' }}>
      
      {/* 1. 노드 카테고리 범례 (상단 왼쪽에 배치) */}
      <div style={{ 
        position: 'absolute', 
        top: 16, 
        left: 16, 
        zIndex: 10, 
        padding: '16px', 
        background: 'rgba(255,255,255,0.95)', 
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
          <LegendItem color={NODE_COLORS.pull_request} emoji="🔀" label="PR (Pull Request)" />
          <LegendItem color={NODE_COLORS.commit} emoji="💬" label="커밋 (Commit)" />
        </div>
        
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #eee', fontSize: '10px', color: status === 'error' ? '#f85149' : '#8b949e' }}>
          {status === 'loading' && '⏳ 데이터 로드 중...'}
          {status === 'loaded' && '✓ 시스템 정상 작동 중'}
          {status === 'error' && '✗ 연결 오류 발생'}
        </div>
      </div>

      {/* 2. 뷰 모드 및 필터 컨트롤 (상단 오른쪽) */}
      <div style={{ 
        position: 'absolute', 
        top: 16, 
        right: 16, 
        zIndex: 10, 
        padding: '16px', 
        background: 'rgba(255,255,255,0.95)', 
        borderRadius: 12, 
        border: '1px solid #d0d7de', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        minWidth: '260px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#021550', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
          🎯 뷰 모드
        </h4>
        
        {/* 뷰 모드 버튼 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => handleViewModeChange('all')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '12px',
              borderRadius: '6px',
              border: viewMode === 'all' ? '2px solid #0969da' : '1px solid #d0d7de',
              background: viewMode === 'all' ? '#ddf4ff' : 'white',
              color: viewMode === 'all' ? '#0969da' : '#24292f',
              cursor: 'pointer',
              fontWeight: viewMode === 'all' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            🌐 전체 뷰
          </button>
          <button
            onClick={() => handleViewModeChange('contributor-focused')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '12px',
              borderRadius: '6px',
              border: viewMode === 'contributor-focused' ? '2px solid #0969da' : '1px solid #d0d7de',
              background: viewMode === 'contributor-focused' ? '#ddf4ff' : 'white',
              color: viewMode === 'contributor-focused' ? '#0969da' : '#24292f',
              cursor: 'pointer',
              fontWeight: viewMode === 'contributor-focused' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            👥 기여자 중심
          </button>
        </div>

        {/* 기여자 중심 뷰일 때만 기여자 목록 표시 */}
        {viewMode === 'contributor-focused' && (
          <>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 12, color: '#57606a' }}>
              기여자 선택 (클릭하여 필터링)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {contributors.map(contributor => (
                <button
                  key={contributor.id}
                  onClick={() => setSelectedContributor(prev => prev === contributor.id ? null : contributor.id)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: selectedContributor === contributor.id ? '2px solid #e3b341' : '1px solid #d0d7de',
                    background: selectedContributor === contributor.id ? '#fff8e6' : 'white',
                    color: '#24292f',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: NODE_COLORS.contributor 
                  }} />
                  <span style={{ fontWeight: selectedContributor === contributor.id ? 'bold' : 'normal' }}>
                    {contributor.label}
                  </span>
                  {selectedContributor === contributor.id && <span style={{ marginLeft: 'auto', color: '#e3b341' }}>✓</span>}
                </button>
              ))}
            </div>
            
            {selectedContributor && (
              <div style={{ 
                marginTop: '12px', 
                padding: '8px', 
                background: '#fff8e6', 
                borderRadius: '6px',
                fontSize: '11px',
                color: '#6f4e1e'
              }}>
                💡 선택한 기여자와 연결된 작업만 강조 표시됩니다
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. 그래프 컨테이너 */}
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