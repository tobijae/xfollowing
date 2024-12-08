import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader } from 'lucide-react';

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'main' | 'follower' | 'following';
}

interface Link {
  source: string;
  target: string;
  type: 'follower' | 'following';
}

const NetworkVisualizer = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/network?username=${username}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch network data');
      }

      // Initialize positions for the network
      const initializedNodes = data.nodes.map((node: Omit<Node, 'x' | 'y' | 'vx' | 'vy'>) => ({
        ...node,
        x: 400 + (Math.random() - 0.5) * 200,
        y: 300 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0,
      }));

      setNodes(initializedNodes);
      setLinks(data.links);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch network data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (nodes.length === 0) return;
    
    const animate = () => {
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        
        // Apply forces between nodes (repulsion)
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[j].x - newNodes[i].x;
            const dy = newNodes[j].y - newNodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) continue;
            
            const force = 2000 / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            newNodes[i].vx -= fx;
            newNodes[i].vy -= fy;
            newNodes[j].vx += fx;
            newNodes[j].vy += fy;
          }
        }
        
        // Apply forces along links
        links.forEach(link => {
          const source = newNodes.find(n => n.id === link.source);
          const target = newNodes.find(n => n.id === link.target);
          if (!source || !target) return;
          
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) return;
          
          const force = (dist - 100) * 0.06;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        });
        
        return newNodes.map(node => {
          if (node.id === dragging) return node;
          
          const damping = 0.7;
          node.vx *= damping;
          node.vy *= damping;
          
          node.x += node.vx;
          node.y += node.vy;
          
          node.x = Math.max(50, Math.min(750, node.x));
          node.y = Math.max(50, Math.min(550, node.y));
          
          return node;
        });
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, dragging, links]);

  const handleMouseDown = (event: React.MouseEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setDragging(nodeId);
    setDragOffset({
      x: node.x - event.clientX,
      y: node.y - event.clientY,
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!dragging) return;
    
    setNodes(prevNodes => prevNodes.map(node => {
      if (node.id === dragging) {
        return {
          ...node,
          x: Math.max(50, Math.min(750, event.clientX + dragOffset.x)),
          y: Math.max(50, Math.min(550, event.clientY + dragOffset.y)),
        };
      }
      return node;
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <Card className="w-full p-4">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter X username (without @)"
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={loading || !username}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Load Network
        </Button>
      </form>
      
      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}

      {nodes.length > 0 && (
        <svg
          viewBox="0 0 800 600"
          className="w-full h-[600px] bg-slate-50"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Draw links */}
          {links.map((link, i) => {
            const source = nodes.find(n => n.id === link.source);
            const target = nodes.find(n => n.id === link.target);
            if (!source || !target) return null;
            
            return (
              <line
                key={`link-${i}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={link.type === 'following' ? '#94a3b8' : '#cbd5e1'}
                strokeWidth={2}
                opacity={0.6}
              />
            );
          })}
          
          {/* Draw nodes */}
          {nodes.map(node => (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              style={{ cursor: 'grab' }}
            >
              <circle
                r={node.type === 'main' ? 25 : 20}
                fill={
                  node.type === 'main' 
                    ? '#4F46E5' 
                    : node.type === 'following' 
                      ? '#93C5FD' 
                      : '#CBD5E1'
                }
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x="25"
                y="5"
                className="text-sm fill-gray-600"
              >
                {node.name}
              </text>
            </g>
          ))}
        </svg>
      )}
    </Card>
  );
};

export default NetworkVisualizer;