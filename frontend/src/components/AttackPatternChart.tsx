/**
 * D3.js Attack Pattern Chart
 * Bar chart showing distribution of MEV attack types
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface AttackData {
  type: string;
  count: number;
  color: string;
}

interface AttackPatternChartProps {
  width?: number;
  height?: number;
}

export const AttackPatternChart: React.FC<AttackPatternChartProps> = ({
  width = 500,
  height = 300
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Sample data (in production, this would come from props)
    const data: AttackData[] = [
      { type: 'Sandwich', count: 42, color: '#ef4444' },
      { type: 'Frontrun', count: 28, color: '#f97316' },
      { type: 'Backrun', count: 19, color: '#f59e0b' },
      { type: 'Arbitrage', count: 15, color: '#84cc16' },
    ];
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const svg = d3.select(svgRef.current)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.type))
      .range([0, innerWidth])
      .padding(0.3);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 0])
      .range([innerHeight, 0])
      .nice();
    
    // Bars
    svg.selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', d => xScale(d.type) || 0)
      .attr('y', innerHeight) // Start from bottom
      .attr('width', xScale.bandwidth())
      .attr('height', 0) // Start with 0 height
      .attr('fill', d => d.color)
      .attr('rx', 4)
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr('y', d => yScale(d.count))
      .attr('height', d => innerHeight - yScale(d.count));
    
    // Add count labels on bars
    svg.selectAll('text.count')
      .data(data)
      .join('text')
      .attr('class', 'count')
      .attr('x', d => (xScale(d.type) || 0) + xScale.bandwidth() / 2)
      .attr('y', innerHeight)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .text(d => d.count)
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr('y', d => yScale(d.count) + 20);
    
    // X axis
    svg.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280');
    
    // Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280');
    
    // Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280')
      .text('Attacks Detected');
    
    // Title
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#374151')
      .text('MEV Attacks (Last 24h)');
    
  }, [width, height]);
  
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
    />
  );
};
