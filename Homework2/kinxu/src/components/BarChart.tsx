import React from "react";
import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { isEmpty } from "lodash";
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

import { BookData, ComponentSize, Margin } from '../types';

export default function BarChart() {
    const [data, setData] = useState<BookData[]>([]);
    const barRef = useRef<HTMLDivElement>(null);
    const margin: Margin = {top: 40, right: 160, bottom: 80, left: 60 };
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
    
    useResizeObserver({ ref: barRef as React.RefObject<HTMLDivElement>, onResize });
      

    // Read data
    useEffect(() => {
        const readData = async() => {
            const csvData = await d3.csv("./data/top_1000_most_swapped_books.csv")
            setData(csvData)
        }
        readData()
    }, []);

    // Generate bar char
    useEffect(() => {
        if (isEmpty(data)) return;
        if (size.width === 0 || size.height === 0) return;
        d3.select('#bar-svg').selectAll('*').remove();
        generateBarChart();
      }, [data, size])


    function generateBarChart() {
        const barChartContainer = d3.select("#bar-svg");
        const ratings = [3, 3.5, 4, 4.5, d3.max(data.map((dataPoint) => Number(dataPoint.rating_average)))];
        const years = [d3.min(data.map((dataPoint) => Number(dataPoint.publicationYear))), 1800, 1850, 1900, 1950, 2000,
            d3.max(data.map((dataPoint) => Number(dataPoint.publicationYear))) + 1];
        
        // Data needed for bar chart
        let dataUse = [];
        let yearRanges = [];
        let maxCount = 0;
        
        // Get the number of books published in each time period
        for (let i = 0; i < years.length - 1; i++) {
            const minYear = years[i];
            const maxYear = years[i + 1];
            let yearRange = String(minYear) + " - " + String(maxYear - 1);
            let count = 0;
            
            if (i == 0) {
                yearRange = "Pre 1800";
            }
            const yearFilteredData = data.filter((dataPoint) => dataPoint.publicationYear >= minYear &&
            dataPoint.publicationYear < maxYear);
            
            // Count books grouped by average rating range
            for (let j = 0; j < ratings.length - 1; j++) {
                const minRating = ratings[j];
                const maxRating = ratings[j + 1];
                let ratingRange = String(minRating) + " - " + String(maxRating);

                if (j != ratings.length - 2) {
                    ratingRange = String(minRating) + " - " + String(maxRating - 0.01);
                }
                const filteredData = yearFilteredData.filter((dataPoint) => dataPoint.rating_average >= minRating &&
                dataPoint.rating_average < maxRating);

                count += filteredData.length;
                dataUse.push({"year": yearRange, "number_books": filteredData.length, "rating": ratingRange});
            }

            // Find maximum number of books published in a time period
            if (count > maxCount) {
                maxCount = count;
            }

            yearRanges.push(yearRange);
        }

        // Get set of time periods for x-axis
        const ratingRanges = [... new Set(dataUse.map((dataPoint) => dataPoint.rating))]
        

        const xScale = d3.scaleBand()
        .domain(yearRanges)
        .range([margin.left, size.width - margin.right])
        .padding(0.1);

        // Generate x-axis
        const xAxis = barChartContainer.append("g")
        .attr("transform", `translate(0, ${size.height - margin.bottom})`)
        .call(d3.axisBottom(xScale));
        
        // Generate x-axis label
        const xLabel = barChartContainer.append('g')
        .attr('transform', `translate(${(size.width - margin.left) / 2}, ${size.height - margin.top})`)
        .append('text')
        .text('Time Periods')
        .style('font-size', '0.8rem');
    
        const yScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([size.height - margin.bottom, margin.top]);

        // Generate y-axis
        const yAxis = barChartContainer.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));

        // Generate y-axis label
        const yLabel = barChartContainer.append('g')
        .attr('transform', `translate(${margin.left / 2}, ${size.height / 2}) rotate(-90)`)
        .append('text')
        .text('Number of Books')
        .style('font-size', '0.8rem');

        // Set color encoding for average rating ranges
        const colors = d3.scaleOrdinal()
        .domain(ratingRanges)
        .range(d3.schemeGreens[4]);

        // Generate stacked bars
        for (const yearRange of yearRanges) {
            const yearFilteredData = dataUse.filter((dataPoint) => dataPoint.year == yearRange);

            // Running total of books for this time period
            let runningTotalCount = 0

            // Generate a section of this time period's bar
            barChartContainer.append("g")
            .selectAll("rect")
            .data(yearFilteredData)
            .enter()
            .append("rect")
            .attr("x", (dataPoint) => xScale(dataPoint.year))
            .attr("y", (dataPoint) => {
                runningTotalCount += dataPoint.number_books
                return yScale(runningTotalCount)
            })
            .attr("width", xScale.bandwidth())
            .attr("height", (dataPoint) => {
                const previousCount = runningTotalCount - dataPoint.number_books
                return yScale(previousCount) - yScale(runningTotalCount)
            })
            .style("fill", (dataPoint) => colors(dataPoint.rating))
        }

        const legend = barChartContainer.append("g")
        .attr("id", "bar-chart-legend-container")
        .attr("transform", `translate(${size.width - margin.right}, ${margin.top + 20})`)

        // Generate legend title
        legend.append("g")
        .append("text")
        .attr("transform", `translate(0, 15)`)
        .style("text-anchor", "right")
        .style("font-weight", "bold")
        .style("font-size", ".8rem")
        .text("Average Rating Range")

        // Generate legend
        const legendItem = legend.selectAll(".legend-item")
        .data(ratingRanges)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (dataPoint, i) => `translate(0, ${i * 25 + 20})`);

        legendItem.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", dataPoint => colors(dataPoint));

        legendItem.append("text")
        .attr("x", 26)
        .attr("y", 15)
        .style("font-size", "0.8rem")
        .text(dataPoint => dataPoint);

        // Generate title
        const title = barChartContainer.append('g')
        .append("text")
        .attr("transform", `translate(${size.width / 2}, ${margin.top - 15})`)
        .attr("d", '0.5rem')
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Distribution of Most-Swapped Books by Publication Time Period and Average Rating") 

    }

    return (
        <>
            <div ref = {barRef} className = "chart-container">
                <svg id = "bar-svg" width = "100%" height = "100%"></svg>
            </div>
        </>
    )
}