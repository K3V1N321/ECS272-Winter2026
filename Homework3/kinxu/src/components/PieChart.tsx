import React from "react";
import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { isEmpty } from "lodash";
import { useResizeObserver, useDebounceCallback } from "usehooks-ts";

import { BookData, ComponentSize } from "../types";

export default function PieChart( {selectedTimePeriod, selectedGenre, setGenre, selectedMinRating, selectedMaxRating} ) {
    const [data, setData] = useState<BookData[]>();
    const pieRef = useRef<HTMLDivElement>(null);
    const margin = {top: 40, right: 120, bottom: 100, left: 20 };
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    // Radius of pie chart
    const radius = Math.min(size.width - margin.right - margin.left, size.height - margin.bottom - margin.top) / 2;
    const pieCenterX = margin.left + (size.width - margin.right - margin.left) /2;
    const pieCenterY = margin.top + 15 + (size.height - margin.bottom - margin.top) / 2;

    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
        
    useResizeObserver({ ref: pieRef as React.RefObject<HTMLDivElement>, onResize });

    //Read Data
    useEffect(() => {
        const readData = async() => {
            const csvData: BookData[] = await d3.csv("./data/top_1000_most_swapped_books.csv")
            setData(csvData)
        }
        readData()

        d3.select("body")
        .append("div")
        .attr("id", "pie-chart-tooltip")
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

    // Generate Pie Chart
    useEffect(() => {
        if (isEmpty(data)) {return};
        if (size.width === 0 || size.height === 0) {return};
        if (selectedTimePeriod == null) {return}
        d3.select("#pie-svg").selectAll("*").remove();
        setGenre(null);
        generatePieChart()
    }, [data, size, selectedTimePeriod, selectedMinRating, selectedMaxRating])

    function generatePieChart() {
        let minYear = 0;
        let maxYear = 0;

        if (selectedTimePeriod == "Pre 1800s") {
            maxYear = 1799;
        }
        else if (selectedTimePeriod != null) {
            minYear = Number(selectedTimePeriod.slice(0, selectedTimePeriod.length - 1));
            maxYear = minYear + 9;
            if (minYear == 2020) {
                maxYear = 2025
            }
        }
        const pieChartContainer = d3.select("#pie-svg");
        let totalBooks: number = 0

        let genreCounts: Record<string, number> = {};
        let subsetGenreCounts: Record<string, number> = {};
        let pieChartData: Record<string, number> = {};

        // Count frequency of each genre
        for (const book of data) {
            const genre = book.genre;
            // Get frequency of genre out of entire dataset
            if (genre in genreCounts) {
                genreCounts[genre] += 1;
            }
            else {
                genreCounts[genre] = 1;
            }

            const withinTimePeriod = book.publicationYear >= minYear && book.publicationYear <= maxYear;
            const withinRatingRange = Number(book.rating_average) >= selectedMinRating && Number(book.rating_average) <= selectedMaxRating;

            // Get frequency of genre out of subset of books with an average rating >= 4.5
            if (withinTimePeriod && withinRatingRange) {
                if (genre in subsetGenreCounts) {
                    subsetGenreCounts[genre] += 1;
                }
                else {
                    subsetGenreCounts[genre] = 1;
                }
                totalBooks += 1;
            }
        }


        // Get top 7 most frequent genres in the entire dataset
        const genreCountsArray = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1]);

        const topGenres = genreCountsArray.slice(0, 7)
        .map((entry) => entry[0])
        .concat(["Other Genre"]);

        // Get distribution of genres for pie chart
        for (const genre of Object.keys(subsetGenreCounts)) {
            if (topGenres.includes(genre)) {
                pieChartData[genre] = subsetGenreCounts[genre];
            }
            else {
                if ("Other Genre" in pieChartData) {
                    pieChartData["Other Genre"] += subsetGenreCounts[genre];
                }
                else {
                    pieChartData["Other Genre"] = subsetGenreCounts[genre];
                }
            }
        }
        
        // Set color for each genre
        const colors = d3.scaleOrdinal()
        .domain(topGenres)
        .range(d3.schemeCategory10);

        

        const pie = d3.pie().value((data) => data[1]);

        pieChartData = pie(Object.entries(pieChartData));

        var arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

        const pieChartGroup = pieChartContainer
        .append("g")
        .attr("id", "pie-chart-group")
        .attr("transform", `translate(${pieCenterX}, ${pieCenterY})`);
        

        // Generate pie chart
        pieChartGroup
        .selectAll("path")
        .data(pieChartData)
        .enter()
        .append("path")
        .attr("id", (dataPoint) => {
            const genre = dataPoint.data[0].replaceAll("'", "").replaceAll(" ", "_")
            return `${genre}_slice`
        })
        .attr("class", (dataPoint) => {
            const genre = dataPoint.data[0].replaceAll("'", "").replaceAll(" ", "_")
            return genre
        })
        .attr("fill", (datapoint) => colors(datapoint.data[0]))
        .attr("stroke", "black")
        .style("stroke-width", "2px")
        .attr("d", arcGenerator)
        // .attr("d", arcGenerator)
        .on("mouseover", function(event, dataPoint) {
            d3.select(this).style("cursor", "pointer");
            const percent: number = (dataPoint.value / totalBooks) * 100;

            // Highlight slice
            d3.select(this)
            .attr("stroke", "black")
            .style("stroke-width", "7px")

            // Show info
            d3.select("#pie-chart-tooltip")
            .html(`<strong>${percent.toFixed(2)}%</strong><br/>${dataPoint.value} Books`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .style("opacity", 1)

        })
        .on("mousemove", function(event, dataPoint) {
            // Move tooltip with cursor
            d3.select("#pie-chart-tooltip")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            
        })
        .on("mouseout", function(event, dataPoint) {
            const genre = dataPoint.data[0];

            // If its not the selected slice, unhighlight it
            if (genre != selectedGenre) {
                d3.select(this).attr("stroke", "black")
                .style("stroke-width", "2px");
            }

            // Hide tooltip
            d3.select("#pie-chart-tooltip")
            .style("opacity", 0);
        })
        .on("click", function(event, dataPoint) {
            const genre = dataPoint.data[0];
            // Click on already selected slice unselects it
            if (selectedGenre == genre) {
                selectedGenre = null;
                setGenre(null);
                d3.select(this).attr("stroke", "black")
                .style("stroke-width", "2px");
            }
            else {
                // If no slice already selected
                if (selectedGenre == null) {
                    d3.select(this)
                    .attr("stroke", "black")
                    .style("stroke-width", "7px")
                }
                // If another slice was already selected
                if (selectedGenre != null) {
                    const prevGenreId = `${selectedGenre.replaceAll("'", "").replaceAll(" ", "_")}_slice`
                    pieChartGroup.select(`#${prevGenreId}`)
                    .attr("stroke", "black")
                    .style("stroke-width", "2px")
                }
                
                selectedGenre = genre;
                setGenre(genre);
            }
        })
        .transition()
        .duration(600)
        .ease(d3.easeCubicInOut)
        .attrTween("d", (dataPoint) =>{
            const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, dataPoint);
            return function(time) {
                return arcGenerator(interpolate(time))
            }
        })

        const legend = pieChartContainer.append("g")
        .attr("id", "pie-chart-legend-container")
        .attr("transform", `translate(${size.width - margin.right}, ${margin.top + 20})`);

        // Generate legend title
        legend.append("g")
        .append("text")
        .attr("transform", `translate(0, 15)`)
        .style("text-anchor", "right")
        .style("font-weight", "bold")
        .style("font-size", "0.8rem")
        .text("Genre");

        // Generate legend
        const legendItem = legend.selectAll(".legend-item")
        .data(topGenres)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (dataPoint, i) => `translate(0, ${i * 35 + 20})`);

        legendItem.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", dataPoint => colors(dataPoint));

        legendItem.append("text")
        .attr("x", 26)
        .attr("y", 0)
        .style("font-size", "0.8rem")
        .each(function(dataPoint) {
            const words = dataPoint.split(" ");
            const lineHeight = 13;
            const textElement = d3.select(this);
            // If there are 2 words, place second word on next line
            for (let i = 0; i < words.length; i++) {
                let yPosition = 15;
                if (i != 0) {
                    yPosition += (i * lineHeight)
                }
                textElement.append("tspan")
                .text(words[i])
                .attr("x", 26)
                .attr("y", yPosition);
            }
        });

        let titleName = "";

        if (selectedTimePeriod == "Pre 1800s") {
            titleName = `Genre Distribution of Books Published In ${selectedTimePeriod}`
        }
        else {
            titleName = `Genre Distribution of Books Published In ${minYear} - ${maxYear}`
        }

        // Generate title
        const title = pieChartContainer.append('g')
        .append('text')
        .attr('transform', `translate(${size.width / 2}, ${margin.top - 15})`)
        .attr('dy', '0.8rem')
        .style('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text(titleName)
    }

    return (
        <>
            <div ref = {pieRef} className = "chart-container">
                <svg id = "pie-svg" width = "100%" height = "100%"></svg>
            </div>
        </>
    )
          
}

  