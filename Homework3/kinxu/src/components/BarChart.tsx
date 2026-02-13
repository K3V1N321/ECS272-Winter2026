import React from "react";
import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { isEmpty } from "lodash";
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

import { BookData, ComponentSize, Margin } from '../types';

export default function BarChart( {selectedTimePeriod, setTimePeriod, selectedMinRating, selectedMaxRating} ) {
    const [data, setData] = useState<BookData[]>([]);
    const barRef = useRef<HTMLDivElement>(null);
    const margin: Margin = {top: 40, right: 160, bottom: 80, left: 60 };
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
    const xScaleRef = useRef(null);
    const yScaleRef = useRef(null);
    
    useResizeObserver({ ref: barRef as React.RefObject<HTMLDivElement>, onResize });
      

    // Read data
    useEffect(() => {
        const readData = async() => {
            const csvData = await d3.csv("./data/top_1000_most_swapped_books.csv")
            setData(csvData)
        }
        readData()

        d3.select("body")
        .append("div")
        .attr("id", "bar-chart-tooltip")
        .attr("class", "chart-tooltip")
        .style("pointer-events", "none")
        .style("position", "absolute")
        .style("background", "rgb(255, 255, 255)")
        .style("color", "black")
        .style("padding", "5px 5px")
        .style("border-radius", "4px")
        .style("font-size", "0.8rem")
        .style("border", "1px solid black")
        .style("opacity", 0)
    }, []);

    // Generate bar char
    useEffect(() => {
        if (isEmpty(data)) return;
        if (size.width === 0 || size.height === 0) return;
        d3.select('#bar-svg').selectAll('*').remove();


        generateBarChart();
      }, [data, size])


      // When selected rating range changes
      useEffect(() => {
        const bars = d3.select("#bar-svg").selectAll("rect")
        if (selectedTimePeriod == null) {
            bars.transition()
            .duration(600)
            .ease(d3.easeCubicInOut)
            .style("stroke-width", "0px")
        }
        else {
            bars.transition()
            .duration(600)
            .ease(d3.easeCubicInOut)
            .style("stroke-width", (dataPoint) => {
                if (dataPoint.year == selectedTimePeriod) {
                    return "5px"
                }
                else {
                    return "0px"
                }
            })
        }
        
      }, [selectedTimePeriod])


      useEffect(() => {
        let dataUse = [];
        let yearRange = [1800]

        const uniqueYears = [... new Set(data.map((dataPoint) => Number(dataPoint.publicationYear)))].sort((a, b) => a - b);
        const minYear = d3.min(uniqueYears);
        const maxYear = d3.max(uniqueYears);

        while (true) {
            const nextYear = yearRange[yearRange.length - 1] + 10;
            if (nextYear < maxYear) {
                yearRange.push(nextYear);
            }
            else {
                break;
            }
        }

        yearRange = ["Pre 1800s"].concat(yearRange);

        for (let i = 0; i < yearRange.length; i++) {
            let startYear: number = 0;
            let endYear: number = 0;
            if (i == 0) {
                startYear = minYear;
                endYear = yearRange[i + 1] - 2; 
            }
            else {
                startYear = yearRange[i];
                endYear = startYear + 9;
            }

            const yearFilteredData = data.filter((dataPoint) => {
                const year = Number(dataPoint.publicationYear);
                return year >= startYear && year <= endYear;
            });
            const filteredData = yearFilteredData.filter((dataPoint) => Number(dataPoint.rating_average) >= selectedMinRating && Number(dataPoint.rating_average) <= selectedMaxRating);

            if (i == 0) {
                dataUse.push({"year": "Pre 1800s", "number_books": filteredData.length})
            }
            else {
                dataUse.push({"year": `${startYear}s`, "number_books": filteredData.length})
            }
        }

        d3.select("#bar-svg").selectAll("rect")
        .data(dataUse)
        .transition()
        .duration(600)
        .ease(d3.easeCircleInOut)
        .attr("y", (dataPoint) => yScaleRef.current(dataPoint.number_books))
        .attr("height", (dataPoint) => yScaleRef.current(0) - yScaleRef.current(dataPoint.number_books))


      }, [selectedMinRating, selectedMaxRating])


    function generateBarChart() {
        const barChartContainer = d3.select("#bar-svg");
        let dataUse = [];
        let maxCount = 0;
        let yearRange = [1800]

        const uniqueYears = [... new Set(data.map((dataPoint) => Number(dataPoint.publicationYear)))].sort((a, b) => a - b);
        const minYear = d3.min(uniqueYears);
        const maxYear = d3.max(uniqueYears);

        while (true) {
            const nextYear = yearRange[yearRange.length - 1] + 10;
            if (nextYear < maxYear) {
                yearRange.push(nextYear);
            }
            else {
                break;
            }
        }

        yearRange = ["Pre 1800s"].concat(yearRange);

        for (let i = 0; i < yearRange.length; i++) {
            let startYear: number = 0;
            let endYear: number = 0;
            if (i == 0) {
                startYear = minYear;
                endYear = yearRange[i + 1] - 2; 
            }
            else {
                startYear = yearRange[i];
                endYear = startYear + 9;
            }

            const yearFilteredData = data.filter((dataPoint) => {
                const year = Number(dataPoint.publicationYear);
                return year >= startYear && year <= endYear;
            });
            const filteredData = yearFilteredData.filter((dataPoint) => Number(dataPoint.rating_average) >= selectedMinRating && Number(dataPoint.rating_average) <= selectedMaxRating);

            if (filteredData.length > maxCount) {
                maxCount = filteredData.length
            }
            if (i == 0) {
                dataUse.push({"year": "Pre 1800s", "number_books": filteredData.length})
            }
            else {
                dataUse.push({"year": `${startYear}s`, "number_books": filteredData.length})
            }
        }        

        xScaleRef.current = d3.scaleBand()
        .domain(dataUse.map((dataPoint) => dataPoint.year))
        .range([margin.left, size.width - margin.right])
        .padding(0.1);

        // Generate x-axis
        const xAxis = barChartContainer.append("g")
        .attr("id", "x-axis")
        .attr("transform", `translate(0, ${size.height - margin.bottom})`)
        .call(d3.axisBottom(xScaleRef.current));

        xAxis.selectAll("g")
        .on("mouseover", function(event, dataPoint) {
            d3.select(this).style("cursor", "pointer");
            const barId = `bar-${dataPoint.replace(" ", "_")}`;
            const barData = d3.select(`#${barId}`).data()[0];
            let dates = barData.year;
            if (dates != "Pre 1800s") {
                const start = Number(dates.slice(0, dates.length - 1));
                let end = start + 9;
                if (start == 2020) {
                    end = start + 5
                }
                dates = String(`${start} - ${end}`)
            }
            d3.select("#bar-chart-tooltip")
            .html(`<strong>${dates}</strong><br/>${barData.number_books} Books`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .style("opacity", 1)
        })
        .on("mousemove", function(event, dataPoint) {
            d3.select("#bar-chart-tooltip")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .style("opacity", 1);
        })
        .on("mouseout", function(event, dataPoint) {
            d3.select("#bar-chart-tooltip")
            .style("opacity", 0);
        })
        .on("click", function(event, dataPoint) {
            const barId = `bar-${dataPoint.replace(" ", "_")}`;
            const barData = d3.select(`#${barId}`).data()[0];
            if (selectedTimePeriod != barData.year) {
                selectedTimePeriod = barData.year;
                setTimePeriod(selectedTimePeriod);
            }
        })
        
        
        // Generate x-axis label
        const xLabel = barChartContainer.append('g')
        .attr('transform', `translate(${(size.width - margin.left) / 2}, ${size.height - margin.top})`)
        .append('text')
        .text('Time Periods')
        .style('font-size', '0.8rem');
    
        yScaleRef.current = d3.scaleLinear()
        .domain([0, maxCount])
        .range([size.height - margin.bottom, margin.top]);

        // Generate y-axis
        const yAxis = barChartContainer.append("g")
        .attr("id", "y-axis")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScaleRef.current));

        // Generate y-axis label
        const yLabel = barChartContainer.append('g')
        .attr('transform', `translate(${margin.left / 2}, ${size.height / 2}) rotate(-90)`)
        .append('text')
        .text('Number of Books')
        .style('font-size', '0.8rem');

        barChartContainer.selectAll("rect")
        .data(dataUse)
        .enter()
        .append("rect")
        .attr("id", (dataPoint) => `bar-${dataPoint.year.replace(" ", "_")}`)
        .attr("x", (dataPoint) => xScaleRef.current(dataPoint.year))
        .attr("y", (dataPoint) => yScaleRef.current(dataPoint.number_books))
        .attr("width", xScaleRef.current.bandwidth())
        .attr("height", (dataPoint) => yScaleRef.current(0) - yScaleRef.current(dataPoint.number_books))
        .style("fill", "teal")
        .on("mouseover", function(event, dataPoint) {
            d3.select(this).style("cursor", "pointer");
            let dates = dataPoint.year;
            if (dates != "Pre 1800s") {
                const start = Number(dates.slice(0, dates.length - 1));
                let end = start + 9;
                if (start == 2020) {
                    end = start + 5;
                }
                dates = String(`${start} - ${end}`);
            }
            d3.select("#bar-chart-tooltip")
            .html(`<strong>${dates}</strong><br/>${dataPoint.number_books} Books`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .style("opacity", 1);
        })
        .on("mousemove", function(event, dataPoint) {
            d3.select("#bar-chart-tooltip")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .style("opacity", 1);
        })
        .on("mouseout", function(event, dataPoint) {
            d3.select("#bar-chart-tooltip")
            .style("opacity", 0);
        })
        .on("click", function(event, dataPoint) {
            if (selectedTimePeriod != dataPoint.year) {
                selectedTimePeriod = dataPoint.year;
                setTimePeriod(selectedTimePeriod);
            }
        })
        .style("stroke-width", (dataPoint) => {
            if (selectedTimePeriod.includes(dataPoint.year)) {
                return "5px";
            }
            else {
                return "0px";
            }
        })
        .style("stroke", "black")


        // Generate title
        const title = barChartContainer.append('g')
        .append("text")
        .attr("transform", `translate(${size.width / 2}, ${margin.top - 15})`)
        .attr("d", '0.5rem')
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Distribution of Most-Swapped Books by Publication Time Period") 

    }

    return (
        <>
            <div ref = {barRef} className = "chart-container">
                <svg id = "bar-svg" width = "100%" height = "100%"></svg>
            </div>
        </>
    )
}