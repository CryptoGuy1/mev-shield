/**
 * D3.js Gas Price Chart
 * Line chart showing gas price trends over time
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface GasPriceData {
  timestamp: Date;
  price: number;
}

interface GasPriceChartProps {
  width?: number;
  height?: number;
}

export const GasPriceChart: React.FC<GasPriceChartProps> = ({
  width = 600,
  height = 250
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<GasPriceData[]>([]);
  
  // Generate sample data (in production, this comes from API)
  useEffect(() => {
    const now = new Date();
    const sampleData: GasPriceData[] = Array.from({ length: 50 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (50 - i) * 60000), // Last 50 minutes
      price: 25 + Math.random() * 15 + Math.sin(i / 5) * 5
    }));
    setData(sampleData);
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1), {
          timestamp: new Date(),
          price: 25 + Math.random() * 15 + Math.sin(Date.now() / 30000) * 5
        }];
        return newData;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const svg = d3.select(svgRef.current)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.timestamp) as [Date, Date])
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.price) || 0])
      .range([innerHeight, 0])
      .nice();
    
    // Line generator
    const line = d3.line<GasPriceData>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.price))
      .curve(d3.curveMonotoneX);
    
    // Add gradient for area fill
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'gas-gradient')
      .attr('x1', '0%')
      .attr('x2', '0%')
      .attr('y1', '0%')
      .attr('y2', '100%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.4);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0);
    
    // Area generator
    const area = d3.area<GasPriceData>()
      .x(d => xScale(d.timestamp))
      .y0(innerHeight)
      .y1(d => yScale(d.price))
      .curve(d3.curveMonotoneX);
    
    // Draw area
    svg.append('path')
      .datum(data)
      .attr('fill', 'url(#gas-gradient)')
      .attr('d', area);
    
    // Draw line
    const path = svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', line);
    
    // Animate line drawing
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1000)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0);
    
    // X axis
    svg.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d3.timeFormat('%H:%M') as any))
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', '#6b7280');
    
    // Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', '#6b7280');
    
    // Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280')
      .text('Gas Price (Gwei)');
    
    // Current price indicator
    const lastPoint = data[data.length - 1];
    svg.append('circle')
      .attr('cx', xScale(lastPoint.timestamp))
      .attr('cy', yScale(lastPoint.price))
      .attr('r', 4)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    
    // Current price label
    svg.append('text')
      .attr('x', xScale(lastPoint.timestamp) + 10)
      .attr('y', yScale(lastPoint.price) + 4)
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#3b82f6')
      .text(`${lastPoint.price.toFixed(1)} Gwei`);
    
  }, [data, width, height]);
  
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
    />
  );
};
