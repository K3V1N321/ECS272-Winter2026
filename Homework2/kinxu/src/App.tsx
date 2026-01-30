import Example from './components/Example'
import Notes from './components/Notes'
import BarChart from './components/BarChart';
import PieChart from './components/PieChart';
import { NotesWithReducer, CountProvider } from './components/NotesWithReducer';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { grey } from '@mui/material/colors';
import SankeyDiagram from './components/SankeyDiagram';

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
  return (
    <Box id="main-container" sx={{ height: '100%' }}>
      <Stack spacing={1} sx={{ height: '100%' }}>
        {/* Top row: Bar + Pie */}
        <Grid container spacing={1} sx={{ height: '40%' }}>
          <Grid size={12}>
            <BarChart />
          </Grid>
          
        </Grid>
        <Grid size="grow"></Grid>
        {/* Bottom row: Sankey full width */}
        <Grid container spacing={1} sx={{ height: '60%' }}>
          <Grid size={5}>
            <PieChart />
          </Grid>
          <Grid size={7}>
            <SankeyDiagram />
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
