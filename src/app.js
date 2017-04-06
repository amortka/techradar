import * as d3 from 'd3';
import './app.scss';

// const URL = 'https://technology-radar.firebaseio.com/snapshots/PGSNET/august-2016.json';
const URL = 'https://technology-radar.firebaseio.com/snapshots/pgs-frontend/march-2017.json';

const AREA_COLORS = ['#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'];
const PI = 3.14159;

function drawChart(data) {
    console.log('raw data', data);

    const svg = d3.select('#radar');
    const config = getConfig(svg, data.items);

    let g = svg.append('g')
        .attr('transform', `translate(${config.center.x}, ${config.center.y})`);

    drawDebugLayer(g, config);
    drawItemLabels(g, data.items, config);
    drawAreaLebels(g, data, config);
}

// --- draw functions, with update pattern
function drawDebugLayer(selection, config) {
    console.log('config', config);
    let debugGroup = selection.append('g')
        .attr('class', 'debugLayer');

    debugGroup.append('circle')
        .attr('fill', '#00FFFF')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 5);


    debugGroup.append('circle')
        .attr('fill', 'none')
        .attr('stroke', '#FF00FF')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', config.radiusMax);

    // --- items lines
    let lineFn = d3.line()
        .x(d => d[0])
        .y(d => d[1]);

    let lineData = d3.range(0, config.count).map(n => [
        [125 * Math.cos(config.scaleRadialPositionWithBaseShift(n)), 125 * Math.sin(config.scaleRadialPositionWithBaseShift(n))],
        [(config.radiusMax - 10) * Math.cos(config.scaleRadialPositionWithBaseShift(n)), (config.radiusMax - 10) * Math.sin(config.scaleRadialPositionWithBaseShift(n))]
    ]);

    debugGroup
        .append('path')
        .datum([
            [0, 0],
            [0, -config.radiusMax]
        ])
        .attr('fill', 'none')
        .attr('stroke', 'blue')
        .attr('stroke-width', 2)
        .attr('d', lineFn);

    debugGroup
        .append('path')
        .datum([
            [0, 0],
            [0, config.radiusMax]
        ])
        .attr('fill', 'none')
        .attr('stroke', 'blue')
        .attr('stroke-width', 2)
        .attr('d', lineFn);


    debugGroup
        .append('g')
        .attr('class', 'debugLines')
        .selectAll('path')
        .data(lineData)
        .enter()
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', 'red')
        .attr('stroke-width', 0.5)
        .attr('d', lineFn);

}

function drawItemLabels(selection, items, config) {

    let group = selection.select('g.itemsLabels').empty() ? selection.append('g') : selection.select('g.itemsLabels');

    let arcLabel = d3.arc()
        .outerRadius(config.radiusMax)
        .innerRadius(config.radiusMax)
        .startAngle(d => config.scaleRadialPosition(d))
        .endAngle(d => config.scaleRadialPosition(d));

    group.selectAll('.itemLabel')
        .data(items)
        .enter()
        .append('text')
        .attr('class', 'itemLabel')
        .attr('alignment-baseline', 'middle')
        .attr('transform', (d, idx) => {
            let startAngle = config.scaleRadialPosition(idx);
            let endAngle = config.scaleRadialPosition(idx);

            let midAngle = endAngle;//endAngle < PI ? (startAngle + endAngle) / 2 : (startAngle + endAngle) / 2 + PI;
            // let midAngle = endAngle < PI ? (startAngle + endAngle) / 2: (startAngle + endAngle) / 2;

            return `translate(${arcLabel.centroid(idx)[0]} , ${arcLabel.centroid(idx)[1]}) rotate(${rad2deg(midAngle) - 90}) rotate(${midAngle > PI ? -180 : 0})`;
        })
        .attr('text-anchor', (d, idx) => {
            return config.scaleRadialPosition(idx) < PI ? 'start' : 'end';
        })
        .text(d => `${!!d._isNew ? '* ' : ''} ${d.name}`);
}

function drawAreaLebels(selection, data, config) {

    let group = selection.select('g.areaLabels').empty() ? selection.append('g') : selection.select('g.areaLabels');

    let areasData = Object.keys(data.areas)
        .map(area => Object.assign(data.areas[area], {
            name: area
        }))
        .map((area, idx, arr) => {
            // console.log('area', area);
            // console.log('idx', idx);
            // console.log('idx', idx < arr.length-1 ? 1 : 0);

            //area.startAngle

            area.startAngle = config.scaleRadialPosition(arr.reduce((total, curr, idxArea) => {
                return idxArea < idx ? total + (curr.count) : total;
            }, 0));

            // area.endAngle = config.scaleRadialPosition(arr.reduce((total, curr, idxArea) => {
            //         return idxArea < idx ? total + curr.count : total;
            //     }, idx > 0 ? -1 : 0) + area.count);

            area.endAngle = config.scaleRadialPosition(arr.reduce((total, curr, idxArea) => {
                return idxArea < idx ? total + curr.count : total;
            }, -1) + area.count);

            return area;
        });

    let arc = d3.arc()
        .innerRadius(config.radiusMax - 20)
        .outerRadius(config.radiusMax - 23)
        .startAngle(d => d.startAngle)
        .endAngle(d => d.endAngle)
        // .padAngle(deg2rad(10));

    group.selectAll('.areaFill')
        .data(areasData)
        .enter()
        .append('path')
        .attr('class', 'areaFill')
        .attr('fill', d => d.color)
        .attr('d', arc)
        // .transition()
        // .duration(750)
        //.attrTween('d', arcTween(arc));


}

// --- data functions
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
            return d3.ascending(a.area.toLowerCase(), b.area.toLowerCase()) ||
                d3.ascending(a.name.toLowerCase(), b.name.toLowerCase());
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

// --- helpers
function getTextLength(str, selection) {
    let textElement = selection
        .append('text')
        .attr('x', 100)
        .attr('y', 100)
        .attr('class', 'itemLabel')
        .text(str);

    let width = textElement.node().getComputedTextLength();
    textElement.remove();

    return width;
}

function rad2deg(rad) {
    return rad * (180/PI);
}

function deg2rad(deg) {
    return deg * (PI/180);
}

function getConfig(containerEl, items) {
    const width = 1000;
    const height = 1000;
    const legendReserverAngle = 15;
    const baseAngle = PI / 2;

    const count = items.length;

    const bound = Math.min(width, height);

    const center = {
        x: 500,
        y: 500
    };

    // --- estimate length of longest technology
    const longestLabel = items
        .map(item => item.name)
        .sort((a, b) => (a.length - b.length))
        .reverse()[0];

    const longestLabelWidth = getTextLength(longestLabel, containerEl);

    const radiusMax = 0.5 * 0.98 * (bound - longestLabelWidth);

    // --- angles calculcation with reserved space
    const angleStart = deg2rad(legendReserverAngle);
    const angleEnd = deg2rad(360-legendReserverAngle); // 2 * PI === 360
    const angleStep = (angleEnd - angleStart) / items.length;
    // const angleStep = (PI * 2) / items.length;// (angleEnd - angleStart) / items.length;

    const scaleRadialPosition = d3.scaleLinear()
        .range([angleStart, angleEnd])
        .domain([0, items.length]);

    const scaleRadialPositionWithBaseShift = d3.scaleLinear()
        .range([angleStart - baseAngle, angleEnd - baseAngle])
        .domain([0, items.length]);

    return {
        count,
        radiusMax,
        center,
        scaleRadialPosition,
        scaleRadialPositionWithBaseShift,
        angleStart,
        angleEnd,
        angleStep
    }
}

function init() {
    console.clear();
    getData()
        .then(data => processData(data))
        .then(data => drawChart(data));
}

init();
