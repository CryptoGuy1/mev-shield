/**
 * D3.js MEV Heatmap
 * Shows MEV activity intensity across time periods
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface HeatmapData {
  hour: number;
  day: string;
  value: number;
}

interface MEVHeatmapProps {
  width?: number;
  height?: number;
}

export const MEVHeatmap: React.FC<MEVHeatmapProps> = ({
  width = 600,
  height = 250
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Generate sample data
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    const data: HeatmapData[] = [];
    days.forEach(day => {
      hours.forEach(hour => {
        // Simulate higher MEV activity during peak hours (8-20)
        const baseValue = hour >= 8 && hour <= 20 ? 30 : 10;
        const value = baseValue + Math.random() * 40;
        data.push({ hour, day, value });
      });
    });
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    const margin = { top: 30, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const svg = d3.select(svgRef.current)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Scales
    const xScale = d3.scaleBand()
      .domain(hours.map(h => h.toString()))
      .range([0, innerWidth])
      .padding(0.05);
    
    const yScale = d3.scaleBand()
      .domain(days)
      .range([0, innerHeight])
      .padding(0.05);
    
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, d3.max(data, d => d.value) || 0]);
    
    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
    
    // Draw cells
    svg.selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', d => xScale(d.hour.toString()) || 0)
      .attr('y', d => yScale(d.day) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.value))
      .attr('rx', 2)
      .attr('opacity', 0)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);
        tooltip
          .style('visibility', 'visible')
          .html(`${d.day} ${d.hour}:00<br/>MEV Activity: ${d.value.toFixed(0)}`);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke', 'none');
        tooltip.style('visibility', 'hidden');
      })
      .transition()
      .duration(600)
      .delay((d, i) => i * 2)
      .attr('opacity', 1);
    
    // X axis
    svg.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickValues(xScale.domain().filter((_, i) => i % 4 === 0)))
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280');
    
    // Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', '#6b7280');
    
    // X axis label
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280')
      .text('Hour of Day');
    
    // Title
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#374151')
      .text('MEV Activity Heatmap');
    
    // Legend
    const legendWidth = 200;
    const legendHeight = 10;
    
    const legend = svg.append('g')
      .attr('transform', `translate(${innerWidth - legendWidth}, -25)`);
    
    const legendScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickSize(0);
    
    // Legend gradient
    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient');
    
    linearGradient.selectAll('stop')
      .data(colorScale.ticks(10).map((t, i, n) => ({ 
        offset: `${100 * i / n.length}%`, 
        color: colorScale(t) 
      })))
      .join('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);
    
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)');
    
    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280');
    
    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };
    
  }, [width, height]);
  
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
    />
  );
};
