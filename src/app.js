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

    const CONFIG = getConfig(svg);

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
        .attr('transform', `translate(${CONFIG.CENTER.x}, ${CONFIG.CENTER.y})`);

    let defs = svg.append('defs');

    defs.append('polygon')
        .attr('id', 'SYMBOL_TRIANGLE')
        .attr('fill', 'red')
        .attr('points', '0,0 5,0 2.5,4.33');

    let SYMBOL_TRIANGLE = d3.symbol().type(d3.symbolTriangle);

    let debug = g.append('g').attr('id', 'debug');

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


    let areaGroup = g.append('g').attr('class', 'area');

    let areasData = Object.keys(data.areas)
        .map(area => Object.assign(data.areas[area], {
            name: area
        }))
        .map((area, idx, arr) => {
            area._startAngle = scaleRadial(arr.reduce((total, curr, idxArea) => {
                return idxArea < idx ? total + curr.count : total;
            }, 0));

            area._endAngle = scaleRadial(arr.reduce((total, curr, idxArea) => {
                    return idxArea < idx ? total + curr.count : total;
                }, 0) + area.count);

            return area;
        });

    // --- area labels: fill

    let arc = d3.arc()
        .innerRadius(CONFIG.CIRCLE_AREA)
        .outerRadius(CONFIG.CIRCLE_AREA + CONFIG.CIRCLE_AREA_WIDTH)
        .startAngle(d => d._startAngle)
        .endAngle(d => d._endAngle)
        .padAngle(0.01);

    areaGroup.selectAll('.areaFill')
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
    areaGroup
        .selectAll('.areaLabelArc')
        .data(areasData)
        .enter()
        .append('path')
        .attr('id', (d, idx) => 'areaLabel_' + idx)
        .attr('class', 'areaLabelArc')
        .attr('d', (d, idx) => {
            let baseAngle = -Math.PI / 2;
            let padAngle = 0.01;
            let radius = CONFIG.CIRCLE_AREA;// - (CIRCLE_AREA_WIDTH/2);

            let startAngle = scaleRadial(areasData.reduce((total, curr, idxArea) => {
                    return idxArea < idx ? total + curr.count : total;
                }, 0)) + padAngle;

            let endAngle = scaleRadial(areasData.reduce((total, curr, idxArea) => {
                        return idxArea < idx ? total + curr.count : total;
                    }, 0) + d.count) - padAngle;

            let pStart = [radius * Math.cos(baseAngle + startAngle), radius * Math.sin(baseAngle + startAngle)];
            let pEnd = [radius * Math.cos(baseAngle + endAngle), radius * Math.sin(baseAngle + endAngle)];

            return `M ${pStart[0]},${pStart[1]} A ${radius},${radius} 0 0 1 ${pEnd[0]},${pEnd[1]}`;
        });

    // --- area labels: text
    areaGroup.selectAll('.areaLabel')
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

    /*
     // --- blips: old
     areaGroup.selectAll('.segmentPointNew')
     .data(data.items.filter(d => !d._isNew))
     .enter()
     .append('circle')
     .attr('class', 'segmentPoint segmentPointNew')
     .attr('stroke', d => data.areas[d.area].color)
     .attr('cx', d => {
     let angle = (-Math.PI/2) + (d._pos * segAngle + (d._pos+1) * segAngle)/2;
     return MAX_R * scaleYPoint[d.status] * Math.cos(angle);
     })
     .attr('cy', d => {
     let angle = (-Math.PI/2) + (d._pos * segAngle + (d._pos+1) * segAngle)/2;
     return MAX_R * scaleYPoint[d.status] * Math.sin(angle);
     })
     .attr('r', 0)
     .transition()
     .delay((d, idx) => idx * 35)
     .attr('r', 3);


     areaGroup.selectAll('.segmentPointOld')
     .data(data.items.filter(d => d._isNew))
     .enter()
     .append('path')
     .attr('class', 'segmentPoint segmentPointOld')
     .attr('stroke', d => data.areas[d.area].color)
     .attr('d', SYMBOL_TRIANGLE.size(20))
     .attr('transform', d => {
     let angle = (-Math.PI/2) + (d._pos * segAngle + (d._pos+1) * segAngle)/2;
     return `translate(${MAX_R * scaleYPoint[d.status] * Math.cos(angle)}, ${MAX_R * scaleYPoint[d.status] * Math.sin(angle)}) rotate(${d._pos * segAngleDeg - 90})`
     });


     // --- segments
     let segmentsGroup = g.append('g').attr('class', 'segments');
     let segments = segmentsGroup.selectAll('.segment');

     segments
     .data(data.items)
     .enter()
     .append('path')
     .attr('class', (d, idx) => 'segment ' + (idx % 2 === 0 ? 'segment-odd' : 'segment-even'))
     .attr('d',
     d3.arc()
     .innerRadius(CIRCLE_LEVEL)
     .outerRadius(CIRCLE_LEVEL + 10)
     .startAngle((d, idx) => {
     return scaleRadial(idx);
     })
     .endAngle((d, idx) => {
     return scaleRadial(idx + 1);
     })
     )
     .transition()
     .delay((d, idx) => idx * 15)
     .ease(d3.easeBounce)
     .attr('d',
     d3.arc()
     .innerRadius(CIRCLE_LEVEL)
     .outerRadius(MAX_R * 0.90)
     .startAngle((d, idx) => {
     return scaleRadial(idx);
     })
     .endAngle((d, idx) => {
     return scaleRadial(idx + 1);
     })
     .padAngle(0)
     );
     */
/*
    let segmentsGroup = g.append('g').attr('class', 'segments');
    let segments = segmentsGroup.selectAll('.segment');

    let segmentBoundWidth = (CONFIG.CIRCLE_LEVEL_OUTER - CONFIG.CIRCLE_LEVEL_INNER) / 4;
    let segmentBoundStart = CONFIG.CIRCLE_LEVEL_INNER;//CIRCLE_LEVEL;//CIRCLE_AREA - CIRCLE_AREA_WIDTH - CIRCLE_BAR_PADDING - 4 * segmentBoundWidth;

    let segment = segments
        .data(data.items
            //.filter(item => STATUS.indexOf(item.status) <= statusIdx)
        )
        .enter()
        .append('g');

    segment.append('path')
        .attr('class', 'segment')
        .attr('fill', d => data.areas[d.area].color)
        .attr('opacity', d => (1 - STATUS.indexOf(d.status) / 4 + 0.25))
        .attr('d',
            d3.arc()
                .innerRadius((d) => {
                    return segmentBoundStart + (STATUS.indexOf(d.status) - 0.5) * segmentBoundWidth + 0.5;
                })
                .outerRadius((d) => {
                    return segmentBoundStart + (STATUS.indexOf(d.status) - 0.4) * segmentBoundWidth + 0.5;
                })
                .startAngle(d => {
                    return scaleRadial(d._pos);
                })
                .endAngle(d => {
                    return scaleRadial(d._pos + 1);
                })
                .padAngle(0.01)
        )
        .transition()
        .ease(d3.easeBounce)
        .delay((d, idx) => idx * 10)
        .attr('d', d3.arc()
            .innerRadius((d) => {
                return segmentBoundStart + (STATUS.indexOf(d.status) - 0.5) * segmentBoundWidth + 0.5;
            })
            .outerRadius((d) => {
                return segmentBoundStart + (STATUS.indexOf(d.status) + 1) * segmentBoundWidth - 0.5;
            })
            .startAngle(d => {
                return scaleRadial(d._pos);
            })
            .endAngle(d => {
                return scaleRadial(d._pos + 1);
            })
            .padAngle(0.01));

 segments
 .data(data.items)
 .enter()
 .append('text')
 .attr('class', 'segmentLabel')
 .attr('transform', (d, idx) => {
 let startAngle = scaleRadial(idx);
 let endAngle = scaleRadial(idx + 1);
 let midAngle = endAngle < Math.PI ? startAngle / 2 + endAngle / 2 : startAngle / 2 + endAngle / 2 + Math.PI;
 return `translate(${arcLabel.centroid(idx)[0]} , ${arcLabel.centroid(idx)[1]}) rotate(-90) rotate(${(midAngle * 180 / Math.PI)})`;
 })
 .attr('text-anchor', (d, idx) => {
 return scaleRadial(idx + 1) < Math.PI ? 'start' : 'end';
 })
 .attr('dy', '.35em')
 .text(d => `${!!d._isNew ? '* ' : ''} ${d.name}`);
*/


    /*segment.append('path')
        .attr('d', SYMBOL_TRIANGLE.size(d => {
            let angle = segAngle;//(-Math.PI/2) + (d._pos * segAngle + (d._pos+1) * segAngle)/2;
            let r = segmentBoundStart + (STATUS.indexOf(d.status) + 1) * segmentBoundWidth - 0.5;
            let perimeter = (angle / Math.PI / 2 * Math.PI * r);
            return perimeter * perimeter;
        }))
        .attr('fill', d => data.areas[d.area].color)
        .attr('opacity', d => (1 - STATUS.indexOf(d.status) / 4 + 0.25))
        .attr('transform', d => {
            let angle = (-Math.PI / 2) + (d._pos * segAngle + (d._pos + 1) * segAngle) / 2;
            let r = segmentBoundStart + (STATUS.indexOf(d.status) + 1) * segmentBoundWidth + 2;
            return `translate(${r * Math.cos(angle)}, ${r * Math.sin(angle)}) rotate(${Math.floor(rad2deg(angle)) - 30})`
        });*/
    // });


    let arcLabel = d3.arc()
        .outerRadius(CONFIG.CIRCLE_AREA + CONFIG.CIRCLE_AREA_WIDTH + CONFIG.CIRCLE_AREA_LABEL_PADDING)
        .innerRadius(CONFIG.MAX_R)
        .startAngle(d => scaleRadial(d))
        .endAngle(d => scaleRadial(d + 1));




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

function getConfig(containerEl) {
    const {
        width,
        height
    } = containerEl.node().getBoundingClientRect();

    let bound = Math.min(width, height);
    let MAX_R = 0.5 * bound * 0.75;

    const CENTER = {
        x: Math.floor(width / 2),
        y: Math.floor(height / 2)
    };

    const CIRCLE_RESERVED = MAX_R * 0.4;
    const CIRCLE_AREA = MAX_R * 0.925;
    const CIRCLE_AREA_WIDTH = 20;
    const CIRCLE_AREA_LABEL_PADDING = 10;

    const CIRCLE_LEVEL_PADDING = 25;
    const CIRCLE_LEVEL_OUTER = CIRCLE_AREA - CIRCLE_LEVEL_PADDING;
    const CIRCLE_LEVEL_INNER = CIRCLE_RESERVED + 20;//CIRCLE_AREA - CIRCLE_AREA_WIDTH - CIRCLE_LEVEL_PADDING - 4 * CIRCLE_LEVEL_WIDTH;

    return {
        MAX_R,
        CENTER,
        CIRCLE_RESERVED,
        CIRCLE_AREA,
        CIRCLE_AREA_WIDTH,
        CIRCLE_AREA_LABEL_PADDING,
        CIRCLE_LEVEL_OUTER,
        CIRCLE_LEVEL_INNER
    }
}

function init() {
    console.clear();
    getData()
        .then(data => processData(data))
        .then(data => drawChart(data));
}

init();
