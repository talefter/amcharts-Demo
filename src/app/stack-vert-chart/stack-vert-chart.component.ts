import { Component, OnInit } from '@angular/core';

import { useTheme, create, percent, color, DropShadowFilter, Label } from "@amcharts/amcharts4/core";
import { XYChart, ColumnSeries, ValueAxis, CategoryAxis, Legend, XYCursor, LabelBullet, } from "@amcharts/amcharts4/charts";
import { StackVertDataService, DataForStackVertBar } from '../services/stackVertDataService/stack-vert-data.service';
import { BehaviorSubject } from 'rxjs';
import { clone } from '@amcharts/amcharts4/.internal/core/utils/Object';
// import am4themes_animated from "@amcharts/amcharts4/themes/animated";

@Component({
  selector: 'app-stack-vert-chart',
  templateUrl: './stack-vert-chart.component.html',
  styleUrls: ['./stack-vert-chart.component.css']
})
export class StackVertChartComponent implements OnInit {
  //observable that return the current selected data
  dataSubject$: BehaviorSubject<DataForStackVertBar>

  chart: XYChart
  columnText: string
  constructor(private stackVertData: StackVertDataService) {
    this.dataSubject$ = this.stackVertData.selectedData
    this.columnText = ""
  }

  ngOnInit(): void {
    this.chart = create("stackVertChart", XYChart);
    //change chart data on BehaviorSubject event change
    this.dataSubject$.subscribe(x => this.setChart(this.chart, x))
  }

  setChart(chart, dataDisplay) {
    if (!chart)
      return
    chart.data = dataDisplay.data

    //set axis
    removeOldAxisData(chart);
    let categoryAxis: CategoryAxis = this.setXAxis(chart, dataDisplay);
    //change tooltipText data
    categoryAxis.adapter.add("getTooltipText", (a, e, k) => {
      return this.columnText;
    });
    setXAxisTooltip(categoryAxis, chart);
    setYAxis(chart);

    removeOldSeries(chart);
    this.setSeries(dataDisplay);
    addLegend(chart);
  }

  private setSeries(dataDisplay: any) {
    for (let i = 0; i < dataDisplay.display.xAxis.length; i++) {
      const element = dataDisplay.display.xAxis[i];
      const isLastSerie = i == dataDisplay.display.xAxis.length - 1;
      const serie = createSerie(element, element, true, dataDisplay, isLastSerie, this.chart);
      this.setSerieOnColumnOverEv(serie, dataDisplay);
    }
  }
  private setSerieOnColumnOverEv(serie: ColumnSeries, dataDisplay) {
    serie.columns.template.events.on("over", (e) => {
      this.columnText = ""
      const year = (<any>e.target.dataItem).categoryX
      const obj = dataDisplay.data.find(x => x["year"] == year)
      const keys = Object.keys(obj)
      for (let i = 0; i < keys.length; i++) {
        if (keys[i].includes("Project")) {
          const value = obj[keys[i]];
          this.columnText += `${keys[i]}: ${value}\n`
        }
      }
      this.columnText += `total: ${obj.total}`
    })
  }
  private setXAxis(chart: any, dataDisplay: any) {
    let categoryAxis: CategoryAxis = chart.xAxes.push(new CategoryAxis());
    categoryAxis.dataFields.category = dataDisplay.display.yAxis;
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.minGridDistance = 20;
    categoryAxis.tooltipText = this.columnText;
    categoryAxis.tooltipHTML = this.columnText;
    return categoryAxis;
  }
}

//serie functions
function createSerie(field: string, name: string, stacked: boolean, dataDisplay, isLastSerie: boolean, chart: XYChart) {
  let series: ColumnSeries = creatSerieMetadta(chart, field, dataDisplay, name, stacked);

  //on hide or show events we change the column total price of all projects
  onSerieHideEv(series, chart);
  onSerieShownEv(series, chart);
  //we add label to serie if it is the last one
  addLabelToSerie(series, isLastSerie);

  return series
}
function addLabelToSerie(series, isLastSerie) {
  if (isLastSerie) {
    let valueLabel = series.bullets.push(new LabelBullet());
    valueLabel.label.text = "{total}";
    valueLabel.label.dy = -10;
    valueLabel.label.hideOversized = false;
    valueLabel.label.truncate = false;
  }
}
function creatSerieMetadta(chart: XYChart, field: string, dataDisplay: any, name: string, stacked: boolean) {
  let series: ColumnSeries = chart.series.push(new ColumnSeries());
  series.dataFields.valueY = field;
  series.dataFields.categoryX = dataDisplay.display.yAxis;
  series.name = name;
  series.stacked = stacked;
  series.columns.template.width = percent(95);
  return series;
}
function onSerieShownEv(series: ColumnSeries, chart: XYChart) {
  series.events.on("shown", (e) => {
    console.log("appeared");
    const prop = (<ColumnSeries>e.target).dataFields.valueY;
    chart.data.forEach(element => {
      element["total"] += element[prop];
    });
  });
}
function onSerieHideEv(series: ColumnSeries, chart: XYChart) {
  series.events.on("hidden", (e) => {
    const prop = (<ColumnSeries>e.target).dataFields.valueY;
    chart.data.forEach(element => {
      element["total"] -= element[prop];
    });
  });
}
function removeOldSeries(chart: any) {
  const series = [...chart.series._values];
  for (let i = 0; i < series.length; i++) {
    chart.series.removeIndex(0);
  }
}

function addLegend(chart: any) {
  if (!chart.legend) {
    chart.legend = new Legend();
    chart.legend.maxHeight = 40;
    chart.legend.scrollable = true;
  }
}

//axis functions
function setYAxis(chart: any) {
  let valueAxis = chart.yAxes.push(new ValueAxis());
  valueAxis.min = 0;
  valueAxis.cursorTooltipEnabled = false;
}
function setXAxisTooltip(categoryAxis, chart: any) {
  let axisTooltip = categoryAxis.tooltip;
  axisTooltip.background.fill = color("black");
  axisTooltip.stroke = color("red");
  axisTooltip.background.strokeWidth = 0;
  axisTooltip.background.cornerRadius = 3;
  axisTooltip.background.pointerLength = 0;
  axisTooltip.dy = -300;
  axisTooltip.dx = 70;
  axisTooltip.className = "axis-tooltip";

  chart.cursor = new XYCursor();
  (<XYCursor>chart.cursor).lineX.disabled = true;
  (<XYCursor>chart.cursor).lineY.disabled = true;

  let dropShadow = new DropShadowFilter();
  dropShadow.dy = 1;
  dropShadow.dx = 1;
  dropShadow.opacity = 0.5;
  axisTooltip.filters.push(dropShadow);
}
function removeOldAxisData(chart: any) {
  if (chart.xAxes._values.length)
    chart.xAxes.removeIndex(0);
  if (chart.yAxes._values.length)
    chart.yAxes.removeIndex(0);
}

