/**
 * D3.js Risk Gauge Component
 * Beautiful animated gauge showing MEV risk score (0-100)
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface RiskGaugeProps {
  score: number; // 0-100
  width?: number;
  height?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ 
  score, 
  width = 300, 
  height = 200 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current);
    const centerX = width / 2;
    const centerY = height - 20;
    const radius = Math.min(width, height) / 2 - 20;
    
    // Create arc generator
    const arc = d3.arc()
      .innerRadius(radius * 0.7)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .cornerRadius(10);
    
    // Background arc
    svg.append('path')
      .datum({ endAngle: Math.PI / 2 })
      .attr('transform', `translate(${centerX}, ${centerY})`)
      .attr('d', arc as any)
      .attr('fill', '#e5e7eb')
      .attr('opacity', 0.3);
    
    // Color scale
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 30, 70, 100])
      .range(['#10b981', '#fbbf24', '#f59e0b', '#ef4444']);
    
    // Foreground arc (animated)
    const foregroundArc = svg.append('path')
      .datum({ endAngle: -Math.PI / 2 })
      .attr('transform', `translate(${centerX}, ${centerY})`)
      .attr('fill', colorScale(score));
    
    // Animate arc
    foregroundArc.transition()
      .duration(1000)
      .ease(d3.easeCubicOut)
      .attrTween('d', function(d: any) {
        const interpolate = d3.interpolate(d.endAngle, -Math.PI / 2 + (score / 100) * Math.PI);
        return function(t: number) {
          d.endAngle = interpolate(t);
          return arc(d as any) || '';
        };
      });
    
    // Add score text
    const scoreText = svg.append('text')
      .attr('x', centerX)
      .attr('y', centerY - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '48px')
      .attr('font-weight', 'bold')
      .attr('fill', colorScale(score))
      .text('0');
    
    // Animate score text
    scoreText.transition()
      .duration(1000)
      .ease(d3.easeCubicOut)
      .tween('text', function() {
        const interpolate = d3.interpolate(0, score);
        return function(t: number) {
          d3.select(this).text(Math.round(interpolate(t)));
        };
      });
    
    // Add label
    svg.append('text')
      .attr('x', centerX)
      .attr('y', centerY + 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('fill', '#6b7280')
      .text('Risk Score');
    
    // Add risk level labels
    const labels = [
      { angle: -Math.PI / 2, text: 'Low', x: centerX - radius * 0.9, y: centerY },
      { angle: 0, text: 'Med', x: centerX, y: centerY - radius * 0.85 },
      { angle: Math.PI / 2, text: 'High', x: centerX + radius * 0.9, y: centerY }
    ];
    
    labels.forEach(label => {
      svg.append('text')
        .attr('x', label.x)
        .attr('y', label.y)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#9ca3af')
        .text(label.text);
    });
    
  }, [score, width, height]);
  
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    />
  );
};
