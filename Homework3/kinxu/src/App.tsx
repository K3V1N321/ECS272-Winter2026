import BarChart from './components/BarChart';
import PieChart from './components/PieChart';
import SankeyDiagram from './components/SankeyDiagram';
import { useState } from "react"
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

// Adjust the color theme for material ui
const theme = createTheme({
  palette: {
    primary:{
      main: grey[700],
    },
    secondary:{
      main: grey[700],
    }
  },
})

// For how Grid works, refer to https://mui.com/material-ui/react-grid/

function Layout() {
  const [selectedTimePeriod, setTimePeriod] = useState("2020s");
  const [selectedMinRating, setMinRating] = useState(3.14);
  const [selectedMaxRating, setMaxRating] = useState(4.95);

  const [selectedGenre, setGenre] = useState(null);
  return (
    <Box id="main-container" sx={{ height: '100%' }}>
      <Stack spacing={1} sx={{ height: '100%' }}>
        <Grid container spacing={1} sx={{ height: '40%' }}>
          <Grid size={12}>
            <div style = {{position: "relative",
              width: "100%",
              height: "100%",
              margin: "20px"}}>
              
              <span>Minimum Average Rating: </span>
              <select id = "min-rating"
              value = {selectedMinRating}
              onChange = {(element) => {
                setMinRating(parseFloat(element.target.value))
                setGenre(null)
              }}>
                <option value = "3.14"> 3.14</option>
                <option value = "3.5" disabled = {selectedMaxRating < 3.5}> 3.5</option>
                <option value = "4" disabled = {selectedMaxRating < 4}> 4</option>
                <option value = "4.5" disabled = {selectedMaxRating < 4.5}> 4.5</option>
                <option value = "4.95" disabled = {selectedMaxRating < 4.95}> 4.95</option>
              </select>
              <span style = {{"marginLeft": "20px"}}>Maximum Average Rating: </span>
              <select id = "max-rating"
              value = {selectedMaxRating}
              onChange = {(element) => {
                setMaxRating(parseFloat(element.target.value))
                setGenre(null)
              }}>
                <option value = "3.14" disabled = {selectedMinRating > 3.14}> 3.14</option>
                <option value = "3.5" disabled = {selectedMinRating > 3.5}> 3.5</option>
                <option value = "4" disabled = {selectedMinRating > 3.4}> 4</option>
                <option value = "4.5" disabled = {selectedMinRating > 4.5}> 4.5</option>
                <option value = "4.95"> 4.95</option>
              </select>
              <BarChart selectedTimePeriod = {selectedTimePeriod} setTimePeriod = {setTimePeriod} selectedMinRating = {selectedMinRating} selectedMaxRating = {selectedMaxRating}/>
            </div>
          </Grid>
          
        </Grid>
        <Grid size="grow"></Grid>
        {/* Bottom row: Sankey full width */}
        <Grid container spacing={1} sx={{ height: '60%' }}>
          <Grid size={5}>
            <PieChart selectedTimePeriod = {selectedTimePeriod} selectedGenre = {selectedGenre} setGenre = {setGenre} selectedMinRating = {selectedMinRating} selectedMaxRating = {selectedMaxRating}/>
          </Grid>
          <Grid size={7}>
            <SankeyDiagram selectedTimePeriod = {selectedTimePeriod} selectedGenre = {selectedGenre} selectedMinRating = {selectedMinRating} selectedMaxRating = {selectedMaxRating}/>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  )
}

export default App
