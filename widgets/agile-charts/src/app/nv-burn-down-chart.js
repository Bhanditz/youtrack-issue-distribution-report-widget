// This chart source is based on nv.models.lineChart source.
if (window.nv && window.nv.models) {
  window.nv.models.burnDownChart = function() {
    'use strict';
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var lines = nv.models.line();
    var xAxis = nv.models.axis();
    var yAxis = nv.models.axis();
    var legend = nv.models.legend();
    var interactiveLayer = nv.interactiveGuideline();

    var margin = {top: 30, right: 20, bottom: 50, left: 60};
    var color = nv.utils.defaultColor();
    var width = null;
    var height = null;
    var rightAlignYAxis = false;
    var useInteractiveGuideline = false;
    var tooltips = true;
    var tooltip = function(key, x, y) {
      return '<h3>' + key + '</h3>' + '<p>' + y + ' at ' + x + '</p>';
    };
    var x;
    var y;
    var state = {};
    var defaultState = null;
    var noData = 'No Data Available.';
    var dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState');
    var transitionDuration = 250;
    var behindScheduleKey = 'Behind Schedule';
    var aheadOfScheduleKey = 'Ahead of Schedule';

    xAxis
      .orient('bottom')
      .tickPadding(7)
    ;
    yAxis
      .orient((rightAlignYAxis) ? 'right' : 'left')
    ;

    interactiveLayer.tooltip.valueFormatter(
      function(d) {
        return yAxis.tickFormat()(d);
      }
    );

    //============================================================


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var showTooltip = function(e, offsetElement) {
      var left = e.pos[0] + (offsetElement.offsetLeft || 0);
      var top = e.pos[1] + (offsetElement.offsetTop || 0);
      var x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex));
      var y = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex));
      var content = tooltip(e.series.key, x, y, e, chart);

      nv.tooltip.show([left, top], content, null, null, offsetElement);
    };

    //============================================================


    function chart(selection) {
      selection.each(function(data) {
        var container = d3.select(this);
        var that = this;

        var availableWidth = (width || parseInt(container.style('width')) || 960)
          - margin.left - margin.right;
        var availableHeight = (height || parseInt(container.style('height')) || 400)
          - margin.top - margin.bottom;


        chart.update = function() {
          container.transition().duration(transitionDuration).call(chart);
        };
        chart.container = this;

        //set state.disabled
        state.disabled = data.map(function(d) {
          return !!d.disabled;
        });


        if (!defaultState) {
          var key;
          defaultState = {};
          for (key in state) {
            if (state[key] instanceof Array) {
              defaultState[key] = state[key].slice(0);
            } else {
              defaultState[key] = state[key];
            }
          }
        }

        //------------------------------------------------------------
        // Display noData message if there's nothing to show.

        if (!data || !data.length || !data.filter(function(d) { return d.values.length; }).length) {
          var noDataText = container.selectAll('.nv-noData').data([noData]);

          noDataText.enter().append('text')
            .attr('class', 'nvd3 nv-noData')
            .attr('dy', '-.7em')
            .style('text-anchor', 'middle');

          noDataText
            .attr('x', margin.left + availableWidth / 2)
            .attr('y', margin.top + availableHeight / 2)
            .text(function(d) {
              return d;
            });

          return chart;
        } else {
          container.selectAll('.nv-noData').remove();
        }

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Setup Scales

        x = lines.xScale();
        y = lines.yScale();

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Setup containers and skeleton of chart

        var wrap = container.selectAll('g.nv-wrap.nv-lineChart').data([data]);
        var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-lineChart').append('g');
        var g = wrap.select('g');

        gEnter.append('rect').style('opacity', 0);
        gEnter.append('g').attr('class', 'nv-x nv-axis');
        gEnter.append('g').attr('class', 'nv-y nv-axis');
        gEnter.append('g').attr('class', 'nv-linesWrap');
        gEnter.append('g').attr('class', 'nv-legendWrap');
        gEnter.append('g').attr('class', 'nv-interactive');

        g.select('rect')
          .attr('width', availableWidth)
          .attr('height', (availableHeight > 0) ? availableHeight : 0);
        //------------------------------------------------------------
        // Legend

        legend.width(availableWidth);

        g.select('.nv-legendWrap')
          .datum(data)
          .call(legend);

        if (margin.top !== legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
            - margin.top - margin.bottom;
        }

        wrap.select('.nv-legendWrap')
          .attr('transform', 'translate(0,' + (-margin.top) + ')');

        //------------------------------------------------------------

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        if (rightAlignYAxis) {
          g.select('.nv-y.nv-axis')
            .attr('transform', 'translate(' + availableWidth + ',0)');
        }

        //------------------------------------------------------------
        // Main Chart Component(s)


        //------------------------------------------------------------
        //Set up interactive layer
        if (useInteractiveGuideline) {
          interactiveLayer
            .width(availableWidth)
            .height(availableHeight)
            .margin({left: margin.left, top: margin.top})
            .svgContainer(container)
            .xScale(x);
          wrap.select('.nv-interactive').call(interactiveLayer);
        }


        lines
          .width(availableWidth)
          .height(availableHeight)
          .color(data.map(function(d, i) {
            return d.color || color(d, i);
          }).filter(function(d, i) {
            return !data[i].disabled;
          }));


        var linesWrap = g.select('.nv-linesWrap')
          .datum(data.filter(function(d) {
            return !d.disabled;
          }));

        linesWrap.transition().call(lines);

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Setup Axes
        xAxis
          .scale(x)
          .ticks(availableWidth / 100)
          .tickSize(-availableHeight, 0);

        g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
        g.select('.nv-x.nv-axis')
          .transition()
          .call(xAxis);

        yAxis
          .scale(y)
          .ticks(availableHeight / 36)
          .tickSize(-availableWidth, 0);

        g.select('.nv-y.nv-axis')
          .transition()
          .call(yAxis);
        //------------------------------------------------------------


        //============================================================
        // Event Handling/Dispatching (in chart's scope)
        //------------------------------------------------------------

        legend.dispatch.on('stateChange', function(newState) {
          state = newState;
          dispatch.stateChange(state);
          chart.update();
        });

        interactiveLayer.dispatch.on('elementMousemove', function(e) {
          lines.clearHighlights();
          var singlePoint;
          var pointIndex;
          var pointXLocation;
          var allData = [];
          // We assume that we always have at least 2 points in ideal burndown data.
          var delta = (chart.xScale()(chart.x()(data[0].values[1], 1)) -
            chart.xScale()(chart.x()(data[0].values[0], 0)) + 1) / 2;
          var mousePosition = e.mouseX;

          data
            .filter(function(series, i) {
              series.seriesIndex = i;
              return !series.disabled;
            })
            .forEach(function(series, i) {
              pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
              var point = series.values[pointIndex];
              if (typeof point === 'undefined') {
                return;
              }
              var pointX = chart.xScale()(chart.x()(point, pointIndex));
              if (Math.abs(pointX - mousePosition) < delta) {
                if (typeof singlePoint === 'undefined') {
                  singlePoint = point;
                }
                if (typeof pointXLocation === 'undefined') {
                  pointXLocation = chart.xScale()(chart.x()(point, pointIndex));
                }
                lines.highlightPoint(i, pointIndex, true);
                allData.push({
                  key: series.key,
                  value: chart.y()(point, pointIndex),
                  color: color(series, series.seriesIndex)
                });
              }
            });

          // Calculate ahead of schedule/behind schedule
          var idealBurndownData = data[0].values;
          var remainingEffortData = data[1].values;
          var idealBurndownIndex = nv.interactiveBisect(idealBurndownData, e.pointXValue, chart.x());
          var idealBurndownX = chart.xScale()(chart.x()(idealBurndownData[idealBurndownIndex], idealBurndownIndex));
          var remainingEffortIndex = nv.interactiveBisect(remainingEffortData, e.pointXValue, chart.x());
          var remainingEffortX = chart.xScale()(chart.x()(remainingEffortData[remainingEffortIndex], remainingEffortIndex));
          if ((Math.abs(idealBurndownX - mousePosition) < delta) &&
            (Math.abs(remainingEffortX - mousePosition) < delta)) {
            var diff = idealBurndownData[idealBurndownIndex].value - remainingEffortData[remainingEffortIndex].value;
            var key = aheadOfScheduleKey;
            if (diff < 0) {
              key = behindScheduleKey;
              diff = -diff;
            }
            allData.push({
              key: key,
              value: diff,
              color: '#ffffff'
            });
          }

          var xValue = xAxis.tickFormat()(chart.x()(singlePoint, pointIndex));
          interactiveLayer.tooltip
            .position({left: pointXLocation + margin.left, top: e.mouseY + margin.top})
            .chartContainer(that.parentNode)
            .enabled(tooltips)
            .data({
              value: xValue,
              series: allData
            })();

          interactiveLayer.renderGuideLine(pointXLocation);

        });

        interactiveLayer.dispatch.on('elementMouseout', function() {
          dispatch.tooltipHide();
          lines.clearHighlights();
        });

        dispatch.on('tooltipShow', function(e) {
          if (tooltips) {
            showTooltip(e, that.parentNode);
          }
        });


        dispatch.on('changeState', function(e) {

          if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
            data.forEach(function(series, i) {
              series.disabled = e.disabled[i];
            });

            state.disabled = e.disabled;
          }

          chart.update();
        });

        //============================================================

      });

      return chart;
    }


    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    lines.dispatch.on('elementMouseover.tooltip', function(e) {
      e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
      dispatch.tooltipShow(e);
    });

    lines.dispatch.on('elementMouseout.tooltip', function(e) {
      dispatch.tooltipHide(e);
    });

    dispatch.on('tooltipHide', function() {
      if (tooltips) {
        nv.tooltip.cleanup();
      }
    });

    //============================================================


    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.lines = lines;
    chart.legend = legend;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.interactiveLayer = interactiveLayer;

    d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange'
      , 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'useVoronoi', 'id', 'interpolate');

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart.margin = function(_) {
      if (!arguments.length) {
        return margin;
      }
      margin.top = typeof _.top !== 'undefined' ? _.top : margin.top;
      margin.right = typeof _.right !== 'undefined' ? _.right : margin.right;
      margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
      margin.left = typeof _.left !== 'undefined' ? _.left : margin.left;
      return chart;
    };

    chart.width = function(_) {
      if (!arguments.length) {
        return width;
      }
      width = _;
      return chart;
    };

    chart.height = function(_) {
      if (!arguments.length) {
        return height;
      }
      height = _;
      return chart;
    };

    chart.color = function(_) {
      if (!arguments.length) {
        return color;
      }
      color = nv.utils.getColor(_);
      legend.color(color);
      return chart;
    };

    chart.rightAlignYAxis = function(_) {
      if (!arguments.length) {
        return rightAlignYAxis;
      }
      rightAlignYAxis = _;
      yAxis.orient((_) ? 'right' : 'left');
      return chart;
    };

    chart.useInteractiveGuideline = function(_) {
      if (!arguments.length) {
        return useInteractiveGuideline;
      }
      useInteractiveGuideline = _;
      if (_ === true) {
        chart.interactive(false);
        chart.useVoronoi(false);
      }
      return chart;
    };

    chart.tooltips = function(_) {
      if (!arguments.length) {
        return tooltips;
      }
      tooltips = _;
      return chart;
    };

    chart.tooltipContent = function(_) {
      if (!arguments.length) {
        return tooltip;
      }
      tooltip = _;
      return chart;
    };

    chart.state = function(_) {
      if (!arguments.length) {
        return state;
      }
      state = _;
      return chart;
    };

    chart.defaultState = function(_) {
      if (!arguments.length) {
        return defaultState;
      }
      defaultState = _;
      return chart;
    };

    chart.noData = function(_) {
      if (!arguments.length) {
        return noData;
      }
      noData = _;
      return chart;
    };

    chart.transitionDuration = function(_) {
      if (!arguments.length) {
        return transitionDuration;
      }
      transitionDuration = _;
      return chart;
    };

    chart.behindScheduleKey = function(_) {
      if (!arguments.length) {
        return behindScheduleKey;
      }
      behindScheduleKey = _;
      return chart;
    };

    chart.aheadOfScheduleKey = function(_) {
      if (!arguments.length) {
        return aheadOfScheduleKey;
      }
      aheadOfScheduleKey = _;
      return chart;
    };

    //============================================================


    return chart;
  };
}
