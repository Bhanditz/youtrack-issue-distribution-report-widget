import './style/report-chart.scss';

import React from 'react';
import PropTypes from 'prop-types';
import d3 from 'd3/d3';
import {i18n} from 'hub-dashboard-addons/dist/localization';

import './nv-burn-down-chart';

const nv = window.nv;
const GRAPH_TRANSITION_DURATION = 350;
const CHART_MARGIN = 22;

class BurnDownChart extends React.Component {
  static propTypes = {
    reportData: PropTypes.object
  };

  static ChartColor = {
    Ideal: '#76a800',
    Remaining: '#25b7ff',
    Spent: '#c6dbef',
    Overdue: '#fd8d3c'
  };

  static getChartModelData = reportData => {
    const format = d3.time.format('%Y-%m-%d');
    const convertPoint = rawPoint => ({
      date: format.parse(rawPoint.time),
      value: rawPoint.value
    });

    const sprintFinishDate = format.parse(reportData.sprintFinish);
    const idealBurndown = reportData.ideal.map(convertPoint);
    const remainingEstimation =
      reportData.remainingEstimation.map(convertPoint);
    const remainingInSprint = remainingEstimation.filter(
      point => point.date <= sprintFinishDate
    );
    const remainingOutSprint = remainingEstimation.filter(
      point => point.date >= sprintFinishDate
    );
    const data = [{
      key: i18n('Ideal Burndown'),
      values: idealBurndown,
      color: BurnDownChart.ChartColor.Ideal
    }, {
      key: i18n('Remaining Effort'),
      values: remainingInSprint,
      color: BurnDownChart.ChartColor.Remaining
    }];

    if (reportData.cumulativeSpentTime &&
      reportData.cumulativeSpentTime.length > 0) {
      data.push({
        key: i18n('Spent time'),
        values: reportData.cumulativeSpentTime.map(convertPoint),
        color: BurnDownChart.ChartColor.Spent
      });
    }
    if (remainingOutSprint.length > 0) {
      data.push({
        key: i18n('Overdue effort'),
        values: remainingOutSprint,
        color: BurnDownChart.ChartColor.Overdue
      });
    }

    return data;
  };

  static getChartModelDomain = chartModelData => {
    let domain = (chartModelData.length === 0)
      ? null
      : d3.extent(
        d3.merge(
          chartModelData.map(
            series => series.values.map(d => d.value)
          )
        )
      );

    const DOMAIN_GAP = 15;
    if (domain && (domain[0] || domain[0] === 0) && (domain[0] === domain[1])) {
      domain = [domain[0], domain[0] + DOMAIN_GAP];
    }

    return domain;
  };

  constructor(props) {
    super(props);

    this.state = {
      reportData: props.reportData
    };
  }

  componentWillReceiveProps(props) {
    if (props.reportData) {
      this.setState(
        {reportData: props.reportData},
        () => this.drawBarChart()
      );
    }
  }

  drawBarChart = () => {
    const barChartNode = this.barChartNode;
    if (!barChartNode) {
      return;
    }

    const {reportData} = this.state;
    const chartModelData = BurnDownChart.getChartModelData(reportData);

    nv.addGraph(() => {
      const multiBarHorizontalChart = nv.models.burnDownChart();
      const chart = multiBarHorizontalChart.
        margin({
          top: 0, left: CHART_MARGIN, right: CHART_MARGIN, bottom: CHART_MARGIN
        }).
        x(d => d.date).
        y(d => d.value).
        useInteractiveGuideline(true).
        transitionDuration(GRAPH_TRANSITION_DURATION).
        xScale(d3.time.scale()).
        yScale(d3.scale.linear()).
        behindScheduleKey(i18n('Behind Schedule')).
        aheadOfScheduleKey(i18n('Ahead of Schedule'));

      const chartModelDomain =
        BurnDownChart.getChartModelDomain(chartModelData);
      if (chartModelDomain) {
        chart.yDomain(chartModelDomain);
      }

      chart.xAxis.
        axisLabel(reportData.xlabel).
        tickFormat(d3.format(',.2f')).
        showMaxMin(false);

      chart.yAxis.
        axisLabel(reportData.ylabel).
        tickFormat(d3.format('d'));

      d3.select(barChartNode).
        datum(chartModelData).
        call(chart);

      nv.utils.windowResize(chart.update);
    });
  };

  onGetSvgNode = barChartNode => {
    this.barChartNode = barChartNode;
    this.drawBarChart();
  };

  renderChartBody() {
    return (
      <div
        className="report-chart__body"
      >
        <svg ref={this.onGetSvgNode}/>
      </div>
    );
  }

  render() {
    const title = i18n('Total');

    return (
      <div className="report-chart">
        <div
          className="report-chart__title"
        >
          { title }
        </div>
        { this.renderChartBody() }
      </div>
    );
  }
}

export default BurnDownChart;