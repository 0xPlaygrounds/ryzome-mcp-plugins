import { describe, it, expect } from 'vitest';
import { buildCanvasGraph, type StepInput } from '../graph-builder.js';

function hexRegex24() {
  return /^[a-f0-9]{24}$/;
}

function createNodeOps(ops: ReturnType<typeof buildCanvasGraph>['operations']) {
  return ops.filter((o): o is typeof o & { _type: 'createNode' } => o._type === 'createNode');
}

function createEdgeOps(ops: ReturnType<typeof buildCanvasGraph>['operations']) {
  return ops.filter((o): o is typeof o & { _type: 'createEdge' } => o._type === 'createEdge');
}

describe('buildCanvasGraph', () => {
  const canvasId = '0123456789abcdef01234567';

  it('should produce 1 createNode and 0 createEdge for a single step with no deps', () => {
    const steps: StepInput[] = [
      { id: 'a', title: 'Step A', description: 'Do A' },
    ];
    const graph = buildCanvasGraph(steps, canvasId);

    const nodes = createNodeOps(graph.operations);
    const edges = createEdgeOps(graph.operations);

    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);

    const node = nodes[0];
    expect(node.id).toMatch(hexRegex24());
    expect(node.data?._type).toBe('NewDocument');
    if (node.data?._type === 'NewDocument') {
      expect(node.data._content.title).toBe('Step A');
      expect(node.data._content.content?._type).toBe('Text');
      if (node.data._content.content?._type === 'Text') {
        expect(node.data._content.content._content.text).toBe('Do A');
      }
      expect(node.data._content.generated).toBe(true);
    }
    expect(node.width).toBe(320);
  });

  it('should build a linear chain A -> B -> C with 3 createNode and 2 createEdge', () => {
    const steps: StepInput[] = [
      { id: 'a', title: 'A', description: 'First' },
      { id: 'b', title: 'B', description: 'Second', dependsOn: ['a'] },
      { id: 'c', title: 'C', description: 'Third', dependsOn: ['b'] },
    ];
    const graph = buildCanvasGraph(steps, canvasId);

    const nodes = createNodeOps(graph.operations);
    const edges = createEdgeOps(graph.operations);

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);

    const nodeIds = nodes.map(n => n.id);
    expect(new Set(nodeIds).size).toBe(3);

    const [nodeA, nodeB, nodeC] = nodes;
    expect(nodeA.y).toBeLessThan(nodeB.y);
    expect(nodeB.y).toBeLessThan(nodeC.y);

    const edge0 = edges[0];
    expect(edge0.fromNodeId).toBe(nodeA.id);
    expect(edge0.toNodeId).toBe(nodeB.id);
    expect(edge0.fromSide).toBe('bottom');
    expect(edge0.toSide).toBe('top');

    const edge1 = edges[1];
    expect(edge1.fromNodeId).toBe(nodeB.id);
    expect(edge1.toNodeId).toBe(nodeC.id);
  });

  it('should build a diamond DAG with correct depths and 4 createEdge', () => {
    const steps: StepInput[] = [
      { id: 'a', title: 'A', description: 'Root' },
      { id: 'b', title: 'B', description: 'Left', dependsOn: ['a'] },
      { id: 'c', title: 'C', description: 'Right', dependsOn: ['a'] },
      { id: 'd', title: 'D', description: 'Merge', dependsOn: ['b', 'c'] },
    ];
    const graph = buildCanvasGraph(steps, canvasId);

    const nodes = createNodeOps(graph.operations);
    const edges = createEdgeOps(graph.operations);

    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(4);

    const [nodeA, nodeB, nodeC, nodeD] = nodes;
    expect(nodeB.y).toBe(nodeC.y);
    expect(nodeA.y).toBeLessThan(nodeB.y);
    expect(nodeB.y).toBeLessThan(nodeD.y);
    expect(nodeB.x).not.toBe(nodeC.x);
  });

  it('should scope IDs to the canvas', () => {
    const steps: StepInput[] = [
      { id: 'a', title: 'A', description: 'Test' },
    ];
    const canvasA = buildCanvasGraph(steps, 'aaaaaaaaaaaaaaaaaaaaaaaa');
    const canvasB = buildCanvasGraph(steps, 'bbbbbbbbbbbbbbbbbbbbbbbb');

    const nodeA = createNodeOps(canvasA.operations)[0];
    const nodeB = createNodeOps(canvasB.operations)[0];

    expect(nodeA.id).not.toBe(nodeB.id);
    expect(nodeA.id).toMatch(hexRegex24());
    expect(nodeB.id).toMatch(hexRegex24());
  });

  it('should generate sequential edge IDs (e0, e1, ...)', () => {
    const steps: StepInput[] = [
      { id: 'a', title: 'A', description: 'Root' },
      { id: 'b', title: 'B', description: 'Child 1', dependsOn: ['a'] },
      { id: 'c', title: 'C', description: 'Child 2', dependsOn: ['a'] },
    ];
    const graph = buildCanvasGraph(steps, canvasId);

    const edges = createEdgeOps(graph.operations);
    expect(edges).toHaveLength(2);
    expect(edges[0].id).toMatch(hexRegex24());
    expect(edges[1].id).toMatch(hexRegex24());
    expect(edges[0].id).not.toBe(edges[1].id);
  });

  it('should silently drop edges for orphan dependsOn references', () => {
    const steps: StepInput[] = [
      { id: 'a', title: 'A', description: 'Only step', dependsOn: ['nonexistent'] },
    ];
    const graph = buildCanvasGraph(steps, canvasId);

    const nodes = createNodeOps(graph.operations);
    const edges = createEdgeOps(graph.operations);

    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });

  it('should produce equivalent graph structure for the same canvas and input', () => {
    const steps: StepInput[] = [
      { id: 'a', title: 'A', description: 'Root' },
      { id: 'b', title: 'B', description: 'Child', dependsOn: ['a'] },
    ];
    const g1 = buildCanvasGraph(steps, canvasId);
    const g2 = buildCanvasGraph(steps, canvasId);

    const nodes1 = createNodeOps(g1.operations);
    const nodes2 = createNodeOps(g2.operations);
    const edges1 = createEdgeOps(g1.operations);
    const edges2 = createEdgeOps(g2.operations);

    expect(nodes1.map(n => n.id)).not.toEqual(nodes2.map(n => n.id));
    expect(edges1.map(e => e.id)).not.toEqual(edges2.map(e => e.id));

    expect(nodes1.every((node) => typeof node.id === 'string' && hexRegex24().test(node.id))).toBe(
      true,
    );
    expect(nodes2.every((node) => typeof node.id === 'string' && hexRegex24().test(node.id))).toBe(
      true,
    );
    expect(edges1.every((edge) => typeof edge.id === 'string' && hexRegex24().test(edge.id))).toBe(
      true,
    );
    expect(edges2.every((edge) => typeof edge.id === 'string' && hexRegex24().test(edge.id))).toBe(
      true,
    );

    expect(new Set(nodes1.map(n => n.id)).size).toBe(nodes1.length);
    expect(new Set(nodes2.map(n => n.id)).size).toBe(nodes2.length);
    expect(new Set(edges1.map(e => e.id)).size).toBe(edges1.length);
    expect(new Set(edges2.map(e => e.id)).size).toBe(edges2.length);

    expect(
      nodes1.map(n => ({
        x: n.x,
        y: n.y,
        title: n.data?._type === 'NewDocument' ? n.data._content.title : null,
      })),
    ).toEqual(
      nodes2.map(n => ({
        x: n.x,
        y: n.y,
        title: n.data?._type === 'NewDocument' ? n.data._content.title : null,
      })),
    );

    const edgeShape = (
      edges: typeof edges1,
      nodes: typeof nodes1,
    ) => {
      const nodeTitles = new Map(
        nodes.map((node) => [
          node.id,
          node.data?._type === 'NewDocument' ? node.data._content.title ?? null : null,
        ]),
      );

      return edges.map((edge) => ({
        from: nodeTitles.get(edge.fromNodeId) ?? null,
        to: nodeTitles.get(edge.toNodeId) ?? null,
        fromSide: edge.fromSide,
        toSide: edge.toSide,
      }));
    };

    expect(edgeShape(edges1, nodes1)).toEqual(edgeShape(edges2, nodes2));

    expect(nodes1.map(n => ({ x: n.x, y: n.y }))).toEqual(
      nodes2.map(n => ({ x: n.x, y: n.y })),
    );
  });
});
