import * as d3 from 'd3';
import './app.scss';

//const URL = 'https://technology-radar.firebaseio.com/snapshots/PGSNET/august-2016.json';
const URL = 'https://technology-radar.firebaseio.com/snapshots/pgs-frontend/march-2017.json';

const AREA_COLORS = ['#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'];

function drawChart(data) {
    console.log('drawChart data', data);

    const svg = d3.select('#radar');
    const segAngle = (Math.PI * 2) / data.items.length;
    const segAngleDeg = 360 / data.items.length;

    const config = getConfig(svg, data);

    const scaleRadial = d3.scaleLinear()
        .range([0, 2 * Math.PI])
        .domain([0, data.items.length]);

    const STATUS = [
        'Adopt',
        'Trial',
        'Assess',
        'Hold'
    ];

    const scaleYPoint = {
        'Adopt': 0.6,
        'Trial': 0.7,
        'Assess': 0.8,
        'Hold': 0.9
    };

    let g = svg.append('g')
        .attr('transform', `translate(${config.center.x}, ${config.center.y})`);

    let defs = svg.append('defs');

    defs.append('polygon')
        .attr('id', 'SYMBOL_TRIANGLE')
        .attr('fill', 'red')
        .attr('points', '0,0 5,0 2.5,4.33');

    let SYMBOL_TRIANGLE = d3.symbol().type(d3.symbolTriangle);


    /*let innerCircles = g.append('g');

     innerCircles.selectAll('.innerCircle')
     .data(Object.keys(scaleYPoint).map( p => scaleYPoint[p]))
     .enter()
     .append('circle')
     .attr('class', 'innerCircle')
     .attr('cx', 0)
     .attr('cy', 0)
     .attr('r', 0)
     .transition()
     .duration(1500)
     .ease(d3.easeBounce)
     .delay((d, idx) => idx * 100)
     .attr('r', d => (MAX_R * d));


     innerCircles.selectAll('.innerCircleLabelPath')
     .data(Object.keys(scaleYPoint).map( p => scaleYPoint[p]))
     .enter()
     .append('path')
     .attr('class', 'innerCircleLabelPath')
     .attr('id', (d, idx) => 'innerCircle_' + idx)
     .attr('d', d => {
     return `M ${-MAX_R * d},0 A ${-MAX_R * d},${-MAX_R * d} 0 0 1 ${MAX_R * d}, 0`
     });


     // --- area labels: text
     innerCircles.selectAll('.innerCircleLabel')
     .data(STATUS)
     .enter()
     .append('text')
     .attr('class', 'innerCircleLabel')
     .attr('x', 0)
     .attr('dy', 20)
     .attr('text-anchor', 'middle')
     .append('textPath')
     .attr('xlink:href', (d, idx) => '#innerCircle_' + idx)
     .attr('startOffset', '50%')
     .text(d => d);*/



    drawDebugInfo(g, data, config);
    drawExternalLabels(g, data.items, config);
    drawExternalAreaLabels(g, data, config);
    drawInnerTechnologies(g.data.items, config);
}


function drawDebugInfo(selection, data, config) {
    let group = selection.select('g.debug').empty() ? selection.append('g') : selection.select('g.debug');

    console.log('config', JSON.stringify(config, false, 2));

    let debuData = [
        config.maxR,
        config.circle_area,
        config.circle_reserved,
        config.circle_level_inner,
        config.circle_level_outer
    ];

    group.selectAll('.debugInfo')
        .data(debuData)
        .enter()
        .append('circle')
        .attr('class', 'debugInfo')
        .attr('fill', 'none')
        .attr('stroke', 'red')
        .attr('r', d => d);
}

function drawExternalLabels(selection, items, config) {

    let group = selection.select('g.externalLabels').empty() ? selection.append('g') : selection.select('g.externalLabels');

    let arcLabel = d3.arc()
        .outerRadius(config.maxR)
        .innerRadius(config.maxR)
        .startAngle(d => config.scaleRadial(d))
        .endAngle(d => config.scaleRadial(d + 1));

    group.selectAll('.segmentLabel')
        .data(items)
        .enter()
        .append('text')
        .attr('class', 'segmentLabel')
        .attr('transform', (d, idx) => {
            let startAngle = config.scaleRadial(idx);
            let endAngle = config.scaleRadial(idx + 1);
            let midAngle = endAngle < Math.PI ? startAngle / 2 + endAngle / 2 : startAngle / 2 + endAngle / 2 + Math.PI;
            return `translate(${arcLabel.centroid(idx)[0]} , ${arcLabel.centroid(idx)[1]}) rotate(-90) rotate(${(midAngle * 180 / Math.PI)})`;
        })
        .attr('text-anchor', (d, idx) => {
            return config.scaleRadial(idx + 1) < Math.PI ? 'start' : 'end';
        })
        .attr('dy', '.35em')
        .text(d => `${!!d._isNew ? '* ' : ''} ${d.name}`);
}

function drawExternalAreaLabels(selection, data, config) {

    let group = selection.select('g.externalAreaLabels').empty() ? selection.append('g') : selection.select('g.externalAreaLabels');

    let areasData = Object.keys(data.areas)
        .map(area => Object.assign(data.areas[area], {
            name: area
        }))
        .map((area, idx, arr) => {
            area._startAngle = config.scaleRadial(arr.reduce((total, curr, idxArea) => {
                return idxArea < idx ? total + curr.count : total;
            }, 0));

            area._endAngle = config.scaleRadial(arr.reduce((total, curr, idxArea) => {
                    return idxArea < idx ? total + curr.count : total;
                }, 0) + area.count);

            return area;
        });

    let arc = d3.arc()
        .innerRadius(config.circle_area)
        .outerRadius(config.circle_area + config.circle_area_width)
        .startAngle(d => d._startAngle)
        .endAngle(d => d._endAngle)
        .padAngle(0.01);

    group.selectAll('.areaFill')
        .data(areasData)
        .enter()
        .append('path')
        .attr('class', 'areaFill')
        .attr('fill', d => d.color)
        .attr('d', arc)
        .transition()
        .duration(750)
        .attrTween('d', arcTween(arc));

    // --- area labels: base path
    group
        .selectAll('.areaLabelArc')
        .data(areasData)
        .enter()
        .append('path')
        .attr('id', (d, idx) => 'areaLabel_' + idx)
        .attr('class', 'areaLabelArc')
        .attr('d', (d, idx) => {
            let baseAngle = -Math.PI / 2;
            let padAngle = 0.01;
            let radius = config.circle_area;// - (CIRCLE_AREA_WIDTH/2);

            let startAngle = config.scaleRadial(areasData.reduce((total, curr, idxArea) => {
                    return idxArea < idx ? total + curr.count : total;
                }, 0)) + padAngle;

            let endAngle = config.scaleRadial(areasData.reduce((total, curr, idxArea) => {
                        return idxArea < idx ? total + curr.count : total;
                    }, 0) + d.count) - padAngle;

            let pStart = [radius * Math.cos(baseAngle + startAngle), radius * Math.sin(baseAngle + startAngle)];
            let pEnd = [radius * Math.cos(baseAngle + endAngle), radius * Math.sin(baseAngle + endAngle)];

            return `M ${pStart[0]},${pStart[1]} A ${radius},${radius} 0 0 1 ${pEnd[0]},${pEnd[1]}`;
        });

    // --- area labels: text
    group.selectAll('.areaLabel')
        .data(areasData)
        .enter()
        .append('text')
        .attr('class', 'areaLabel')
        .attr('x', 5)
        .attr('dy', -5)
        .attr('text-anchor', 'middle')
        .append('textPath')
        .attr('xlink:href', (d, idx) => '#areaLabel_' + idx)
        .attr('startOffset', '50%')
        .text((d) => d.name);
}

function drawInnerTechnologies(selection, data, config) {

}


function processData(rawData) {
    let data = {
        areas: {}
    };

    data.items = [
        ...(rawData.blips || []),
        ...(rawData.newBlips || []).map(blip => {
            blip._isNew = true;
            return blip;
        })
    ]
        .sort(function(a, b) {
            return d3.ascending(a.area, b.area) ||
                d3.ascending(a.name, b.name);
        })
        .map((d, idx) => {
            d._pos = idx;
            return d;
        });

    let areas = data.items
        .map(item => item.area)
        .filter((item, idx, self) => self.indexOf(item) === idx);


    areas.forEach((area, idx) => {
        data.areas[area] = {
            color: AREA_COLORS[idx],
            count: data.items.filter(item => item.area === area).length
        }
    });

    return data;
}
function getData() {
    return fetch(URL).then(response => response.json());
}
function rad2deg(rad) {
    return rad * (180 / Math.PI);
}
function deg2rad(rad) {
    return rad * (Math.PI / 180);
}
function arcTween(arc) {
    return function(d) {
        let i = d3.interpolate(d._startAngle, d._endAngle);
        return function(t) {
            return arc({
                _startAngle: d._startAngle,
                _endAngle: i(t)
            });
        };
    }
}
function getConfig(containerEl, data) {
    const {
        width,
        height
    } = containerEl.node().getBoundingClientRect();

    let bound = Math.min(width, height);
    let maxR = 0.5 * bound * 0.75;

    const center = {
        x: Math.floor(width / 2),
        y: Math.floor(height / 2)
    };

    const circle_reserved = maxR * 0.4;
    const circle_area = maxR * 0.925;
    const circle_area_width = 20;
    const circle_area_label_padding = 10;

    const circle_level_padding = 25;
    const circle_level_outer = circle_area - circle_level_padding;
    const circle_level_inner = circle_reserved + 20;//CIRCLE_AREA - CIRCLE_AREA_WIDTH - CIRCLE_LEVEL_PADDING - 4 * CIRCLE_LEVEL_WIDTH;

    const scaleRadial = d3.scaleLinear()
        .range([0, 2 * Math.PI])
        .domain([0, data.items.length]);

    return {
        maxR,
        center,
        circle_reserved,
        circle_area,
        circle_area_width,
        circle_area_label_padding,
        circle_level_outer,
        circle_level_inner,
        scaleRadial
    }
}

function init() {
    console.clear();
    getData()
        .then(data => processData(data))
        .then(data => drawChart(data));
}

init();
