/* -----------------------------------------------------------------------------------
   Global Crops
   Developed by the Applications Prototype Lab
   (c) 2015 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    'esri/map',
    'esri/layers/FeatureLayer',
    'esri/layers/ArcGISDynamicMapServiceLayer',
    'esri/layers/ArcGISImageServiceLayer',
    'esri/layers/ArcGISTiledMapServiceLayer',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/renderers/SimpleRenderer',
    'esri/Color',
    'esri/tasks/query',
    'dojo/domReady!'
],
function (
    Map,
    FeatureLayer,
    ArcGISDynamicMapServiceLayer,
    ArcGISImageServiceLayer,
    ArcGISTiledMapServiceLayer,
    SimpleFillSymbol,
    SimpleLineSymbol,
    SimpleRenderer,
    Color,
    Query
    ) {
    $(document).ready(function () {
        // Enforce strict mode
        'use strict';

        var BASEMAP = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer';
        var COMMODITY_SUPPLY_BY_COUNTRY = 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/CommoditySupply/FeatureServer/0';
        var CROPS = 'https://maps2.esri.com/apl1/rest/services/rc/tsc/MapServer';
        var DEFOREST = 'http://50.18.182.188:6080/arcgis/rest/services/ForestLoss_2000_2012/ImageServer';
        var GOOD = '#64B8CD'; // blue
        var BAD = '#FFD887';  // yellow
        var BORDER = '#53585F';
        var width = $('#chart').width();
        var height = $('#chart').height();
        var radius = Math.min(width, height) / 2;

        var _root = {
            name: 'root',
            children: [
                {
                    name: 'total',
                    children: []
                },
                {
                    name: 'deforested',
                    children: []
                }
            ]
        };

        var _countries = new FeatureLayer(COMMODITY_SUPPLY_BY_COUNTRY, {
            mode: FeatureLayer.MODE_SNAPSHOT,
            outFields: [
                'CNTRY_NAME',
                'USA_Cocoa_Tot',
                'USA_Cocoa_Def',
                'USA_CoffeeAllTypes_Tot',
                'USA_CoffeeAllTypes_Def',
                'USA_CoffeeArabica_Tot',
                'USA_CoffeeArabica_Def',
                'USA_CoffeeRobusta_Tot',
                'USA_CoffeeRobusta_Def',
                'USA_Cotton_Tot',
                'USA_Cotton_Def',
                'USA_Maize_Tot',
                'USA_Maize_Def',
                'USA_Wheat_Tot',
                'USA_Wheat_Def',
                'Global_Banana_Tot',
                'Global_Banana_Def',
                'Global_Barley_Tot',
                'Global_Barley_Def',
                'Global_Cocoa_Tot',
                'Global_Cocoa_Def',
                'Global_CoffeeAllTypes_Tot',
                'Global_CoffeeAllTypes_Def',
                'Global_CoffeeArabica_Tot',
                'Global_CoffeeArabica_Def',
                'Global_CoffeeRobusta_Tot',
                'Global_CoffeeRobusta_Def',
                'Global_Maize_Tot',
                'Global_Maize_Def',
                'Global_OilPalm_Tot',
                'Global_OilPalm_Def',
                'Global_Rice_Tot',
                'Global_Rice_Def',
                'Global_Soybean_Tot',
                'Global_Soybean_Def',
                'Global_Wheat_Tot',
                'Global_Wheat_Def'
            ],
            showAttribution: false,
            showLabels: false,
            visible: true
        });
        _countries.setRenderer(new SimpleRenderer(new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 255, 255, 0]), 1), new Color([255, 255, 255, 0]))));
        _countries.setSelectionSymbol(new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 255, 255, 0.5]), 2), new Color([0, 255, 255, 0.5])));
        _countries.on('update-end', function () {
            loadCountryData();
            createChart();
            $('#bottom-middle-panel1').show();
        });

        var _crops = new ArcGISDynamicMapServiceLayer(CROPS, {
            visible: false
        });

        var _deforest = new ArcGISImageServiceLayer(DEFOREST, {
            visible: false
        });

        // Create the map and add the image service layer
        var _map = new Map('map', {
            //basemap: 'dark-gray',
            zoom: 3,
            center: [0, 10],
            logo: false,
            showAttribution: false,
            slider: true,
            wrapAround180: true
        });
        _map.addLayers([
            new ArcGISTiledMapServiceLayer(BASEMAP),
            _crops,
            _countries,
            _deforest
        ]);

        var _path = null;
        var _partition = d3.layout.partition()
            .size([2 * Math.PI, radius * radius])
            .value(function (d) { return 0; });
        var _arc = d3.svg.arc()
            .startAngle(function (d) { return d.x; })
            .endAngle(function (d) { return d.x + d.dx; })
            .innerRadius(function (d) { return Math.sqrt(d.y); })
            .outerRadius(function (d) { return Math.sqrt(d.y + d.dy); });

        function loadCountryData() {
            $.each(_countries.graphics, function () {
                var t = {
                    id: this.attributes[_countries.objectIdField],
                    name: this.attributes.CNTRY_NAME,
                    usa_cocoa: this.attributes.USA_Cocoa_Tot,
                    usa_coffee_all: this.attributes.USA_CoffeeAllTypes_Tot,
                    usa_coffee_arabica: this.attributes.USA_CoffeeArabica_Tot,
                    usa_coffee_robusta: this.attributes.USA_CoffeeRobusta_Tot,
                    usa_cotton: this.attributes.USA_Cotton_Tot,
                    usa_maize: this.attributes.USA_Maize_Tot,
                    usa_wheat: this.attributes.USA_Wheat_Tot,
                    global_banana: this.attributes.Global_Banana_Tot,
                    global_barley: this.attributes.Global_Barley_Tot,
                    global_cocoa: this.attributes.Global_Cocoa_Tot,
                    global_coffee_all: this.attributes.Global_CoffeeAllTypes_Tot,
                    global_coffee_arabica: this.attributes.Global_CoffeeArabica_Tot,
                    global_coffee_robusta: this.attributes.Global_CoffeeRobusta_Tot,
                    global_maize: this.attributes.Global_Maize_Tot,
                    global_oilpalm: this.attributes.Global_OilPalm_Tot,
                    global_rice: this.attributes.Global_Rice_Tot,
                    global_soybean: this.attributes.Global_Soybean_Tot,
                    global_wheat: this.attributes.Global_Wheat_Tot
                };
                var d = {
                    id: this.attributes[_countries.objectIdField],
                    name: this.attributes.CNTRY_NAME,
                    usa_cocoa: this.attributes.USA_Cocoa_Def,
                    usa_coffee_all: this.attributes.USA_CoffeeAllTypes_Def,
                    usa_coffee_arabica: this.attributes.USA_CoffeeArabica_Def,
                    usa_coffee_robusta: this.attributes.USA_CoffeeRobusta_Def,
                    usa_cotton: this.attributes.USA_Cotton_Def,
                    usa_maize: this.attributes.USA_Maize_Def,
                    usa_wheat: this.attributes.USA_Wheat_Def,
                    global_banana: this.attributes.Global_Banana_Def,
                    global_barley: this.attributes.Global_Barley_Def,
                    global_cocoa: this.attributes.Global_Cocoa_Def,
                    global_coffee_all: this.attributes.Global_CoffeeAllTypes_Def,
                    global_coffee_arabica: this.attributes.Global_CoffeeArabica_Def,
                    global_coffee_robusta: this.attributes.Global_CoffeeRobusta_Def,
                    global_maize: this.attributes.Global_Maize_Def,
                    global_oilpalm: this.attributes.Global_OilPalm_Def,
                    global_rice: this.attributes.Global_Rice_Def,
                    global_soybean: this.attributes.Global_Soybean_Def,
                    global_wheat: this.attributes.Global_Wheat_Def
                };
                _root.children[0].children.push(t);
                _root.children[1].children.push(d);
            });
        }
        
        function createChart() {
            var svg = d3.select('#chart').append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

            _path = svg.datum(_root)
                .selectAll('path')
                .data(_partition.nodes)
                .enter()
                .append('path')
                .attr('display', function (d) {
                    // Hides inner ring
                    return d.depth ? null : 'none';
                })
                .attr('d', _arc)
                .attr('class', 'sustainability')
                .attr('stroke', BORDER)
                .attr('fill', function (d) {
                    if (d.depth === 0) { return null; }
                    if (d.depth === 1) {
                        if (d.name === _root.children[1].name) {
                            return BAD;
                        }
                        if (d.name === _root.children[0].name) {
                            return GOOD;
                        }
                    }
                    if (d.depth === 2) {
                        if (d.parent.name === _root.children[1].name) {
                            return BAD;
                        }
                        if (d.parent.name === _root.children[0].name) {
                            return GOOD;
                        }
                    }
                })
                .attr('fill-rule', 'evenodd')
                .each(function (d) {
                    // Stash the old values for transition
                    d.x0 = d.x;
                    d.dx0 = d.dx;
                })
                .on('mouseover', function (d) {
                    var query = new Query();
                    if (d.depth === 1) {
                        //var title = d.depth.name === 'total' ? 'All Suppliers';
                        $('#attribute-country').html('All Suppliers');
                        $('#attribute-size').html('100%');
                        query.objectIds = d.children.filter(function (e) {
                            return e.value >= 0.001;
                        }).map(function (e) {
                            return e.id;
                        });
                    }
                    if (d.depth === 2) {
                        $('#attribute-country').html(d.name);
                        $('#attribute-size').html(d3.round(d.value * 100,1) + '%');
                        query.objectIds = [d.id];
                    }
                    _countries.selectFeatures(query,FeatureLayer.SELECTION_NEW);
                })
                .on('mouseout', function (d) {
                    $('#attribute-country').empty();
                    $('#attribute-size').empty();
                    _countries.clearSelection();
                });
        }

        function updateTonnage() {
            var val = $('#kpi-slider').slider('getValue');
            var def = _root.children[1].value;
            var ton = d3.round(val * 1000000 * def, -3);
            $('#kpi-impact-value').html(d3.format(',')(d3.round(ton)) + ' tons');
        }

        $('#button-deforestation').click(function () {
            if (_deforest.visible) {
                _deforest.hide();
                $('#button-deforestation-text').html('Show Deforestation');
            } else {
                _deforest.show();
                $('#button-deforestation-text').html('Hide Deforestation');
            }
        });
        $('#crop-list > a').click(function () {
            $(this).siblings().removeClass('active');
            $(this).addClass('active');

            var field = $(this).attr('data-field');
            var layer = $(this).attr('data-layer');
            _path.data(
                _partition.value(function (d) {
                    var x = d[field];
                    return x;
                }).nodes
            )
            .transition()
            .duration(1500)
            .attrTween('d', function (a) {
                // Interpolate the arcs in data space.
                var i = d3.interpolate({ x: a.x0, dx: a.dx0 }, a);
                return function (t) {
                    var b = i(t);
                    a.x0 = b.x;
                    a.dx0 = b.dx;
                    return _arc(b);
                };
            });

            if ($('#bottom-middle-panel2').css('display') === 'none') {
                $('#bottom-middle-panel2').show();
                $('#panel-title-4').show();
                $('#kpi-slider').slider({
                    id: 'kpi-slider-internal',
                    range: false,
                    tooltip: 'hide',
                    value: 0,
                    ticks: [0, 100, 200, 300, 400, 500],
                    ticks_labels: ['0', '100', '200', '300', '400', '500'],
                    ticks_snap_bounds: 30
                }).on('change', function (e) {
                    updateTonnage();
                }).on('slideStop', function (e) {
                    updateTonnage();
                });
            } else {
                updateTonnage();
            }
            var ids = _crops.layerInfos.filter(function (e) {
                return e.name === layer;
            }).map(function (e) {
                return e.id;
            });
            _crops.setVisibleLayers(ids, true);
            _crops.show();
            _crops.refresh();
        });
    });
});