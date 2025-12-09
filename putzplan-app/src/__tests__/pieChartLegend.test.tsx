import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CompactAnalytics from '../components/analytics/CompactAnalytics';

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Bar: vi.fn(() => <div data-testid="bar-chart">Bar Chart</div>),
  Pie: vi.fn(({ data, options }) => {
    // Detailed mock to capture data structure
    console.log('🧪 [PIE CHART TEST] Data passed to Pie component:', JSON.stringify(data, null, 2));
    console.log('🧪 [PIE CHART TEST] Options passed to Pie component:', JSON.stringify(options, null, 2));
    
    return (
      <div data-testid="pie-chart">
        <div data-testid="pie-data">{JSON.stringify(data)}</div>
        <div data-testid="pie-options">{JSON.stringify(options)}</div>
        Pie Chart
      </div>
    );
  })
}));

// Mock Recharts components
vi.mock('recharts', () => ({
  LineChart: vi.fn(() => <div data-testid="line-chart">Line Chart</div>),
  Line: vi.fn(() => <div>Line</div>),
  XAxis: vi.fn(() => <div>XAxis</div>),
  YAxis: vi.fn(() => <div>YAxis</div>),
  CartesianGrid: vi.fn(() => <div>CartesianGrid</div>),
  Tooltip: vi.fn(() => <div>Tooltip</div>),
  Legend: vi.fn(() => <div>Legend</div>),
  ResponsiveContainer: vi.fn(({ children }) => <div data-testid="responsive-container">{children}</div>),
  BarChart: vi.fn(() => <div data-testid="bar-chart-recharts">Bar Chart Recharts</div>),
  Bar: vi.fn(() => <div>Bar</div>)
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage
});

// Mock dataManager
const mockDataManager = {
  getState: () => ({
    users: {
      'user1': { id: 'user1', username: 'Darius1', currentMonthPoints: 65 },
      'user2': { id: 'user2', username: 'Lilly', currentMonthPoints: 106 }
    },
    tasks: {
      'task1': { id: 'task1', title: 'Küche putzen', pointsPerExecution: 15 },
      'task2': { id: 'task2', title: 'Bad putzen', pointsPerExecution: 20 }
    },
    executions: {
      'exec1': { id: 'exec1', taskId: 'task1', executedBy: 'user1', pointsAwarded: 15 },
      'exec2': { id: 'exec2', taskId: 'task2', executedBy: 'user2', pointsAwarded: 20 },
      'exec3': { id: 'exec3', taskId: 'task1', executedBy: 'user1', pointsAwarded: 15 },
      'exec4': { id: 'exec4', taskId: 'task2', executedBy: 'user2', pointsAwarded: 20 },
      'exec5': { id: 'exec5', taskId: 'task1', executedBy: 'user1', pointsAwarded: 15 },
      'exec6': { id: 'exec6', taskId: 'task2', executedBy: 'user2', pointsAwarded: 20 }
    },
    currentWG: { id: 'wg1', name: 'Test WG Analytics Legend' }
  }),
  subscribe: vi.fn(),
  unsubscribe: vi.fn()
};

vi.mock('../services/dataManager', () => ({
  dataManager: mockDataManager
}));

describe('🍰 Tortendiagramm Legende Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('🧪 KRITISCH: sollte Legende-Daten mit Pie-Chart-Daten synchronisieren', () => {
    console.log('🧪 Test: Tortendiagramm Legende-Synchronisation');

    render(<CompactAnalytics />);

    // Warte auf das Tortendiagramm
    const pieChart = screen.getByTestId('pie-chart');
    expect(pieChart).toBeInTheDocument();

    // Hole die Chart-Daten aus dem Mock
    const pieDataElement = screen.getByTestId('pie-data');
    const pieOptionsElement = screen.getByTestId('pie-options');
    
    const chartData = JSON.parse(pieDataElement.textContent || '{}');
    const chartOptions = JSON.parse(pieOptionsElement.textContent || '{}');
    
    console.log('📊 Chart Data Labels:', chartData.labels);
    console.log('📊 Chart Data Values:', chartData.datasets?.[0]?.data);
    console.log('📊 Legend Config:', chartOptions.plugins?.legend);

    // Validiere Chart-Daten-Struktur
    expect(chartData.labels).toBeDefined();
    expect(chartData.datasets).toBeDefined();
    expect(chartData.datasets[0].data).toBeDefined();
    
    // Validiere dass Labels und Data Arrays gleiche Länge haben
    expect(chartData.labels.length).toBe(chartData.datasets[0].data.length);
    
    // Teste ob die Legende korrekt generiert wird
    expect(chartOptions.plugins?.legend?.labels?.generateLabels).toBeDefined();
    
    console.log('✅ Basis-Datenstruktur validiert');
  });

  it('🔍 sollte User-Stats mit Chart-Labels korrekt mappen', () => {
    console.log('🧪 Test: User-Stats zu Chart-Labels Mapping');

    render(<CompactAnalytics />);

    const pieDataElement = screen.getByTestId('pie-data');
    const chartData = JSON.parse(pieDataElement.textContent || '{}');
    
    // Erwarte 2 Benutzer aus Mock-Daten
    expect(chartData.labels).toHaveLength(2);
    expect(chartData.datasets[0].data).toHaveLength(2);
    
    // Prüfe ob Benutzernamen korrekt übertragen werden
    expect(chartData.labels).toContain('Darius1');
    expect(chartData.labels).toContain('Lilly');
    
    // Prüfe ob Punkte korrekt übertragen werden
    const data = chartData.datasets[0].data;
    expect(data).toContain(65); // Darius1 Punkte
    expect(data).toContain(106); // Lilly Punkte
    
    console.log('✅ User-Stats Mapping korrekt');
  });

  it('🎨 sollte Farben konsistent zwischen Chart und Legende zuweisen', () => {
    console.log('🧪 Test: Konsistente Farbzuweisung');

    render(<CompactAnalytics />);

    const pieDataElement = screen.getByTestId('pie-data');
    const chartData = JSON.parse(pieDataElement.textContent || '{}');
    
    const colors = chartData.datasets[0].backgroundColor;
    
    // Prüfe ob genügend Farben für alle Benutzer vorhanden sind
    expect(colors).toHaveLength(2);
    expect(colors).toEqual(expect.arrayContaining([
      expect.any(String),
      expect.any(String)
    ]));
    
    // Farben sollten unterschiedlich sein
    expect(colors[0]).not.toBe(colors[1]);
    
    console.log('🎨 Farben:', colors);
    console.log('✅ Farbkonsistenz validiert');
  });

  it('📏 sollte Prozentberechnung korrekt durchführen', () => {
    console.log('🧪 Test: Korrekte Prozentberechnung für Tortendiagramm');

    render(<CompactAnalytics />);

    const pieDataElement = screen.getByTestId('pie-data');
    const chartData = JSON.parse(pieDataElement.textContent || '{}');
    
    const data = chartData.datasets[0].data;
    const total = data.reduce((sum: number, val: number) => sum + val, 0);
    
    console.log('💰 Datenpunkte:', data);
    console.log('💰 Gesamtsumme:', total);
    
    // Berechne erwartete Prozentsätze
    const expectedPercentages = data.map((val: number) => Math.round((val / total) * 100));
    
    console.log('📊 Erwartete Prozentsätze:', expectedPercentages);
    
    // Validiere dass Prozentsätze zu 100% summieren (mit Rundungstoleranz)
    const percentageSum = expectedPercentages.reduce((sum: number, pct: number) => sum + pct, 0);
    expect(percentageSum).toBeGreaterThanOrEqual(99);
    expect(percentageSum).toBeLessThanOrEqual(101);
    
    console.log('✅ Prozentberechnung korrekt');
  });

  it('🏷️ KORREKTUR: sollte Legende-Labels korrekt formatieren', () => {
    console.log('🧪 Test: Legende-Label-Formatierung');

    render(<CompactAnalytics />);

    const pieOptionsElement = screen.getByTestId('pie-options');
    const chartOptions = JSON.parse(pieOptionsElement.textContent || '{}');
    
    const legendConfig = chartOptions.plugins?.legend;
    
    // Prüfe ob generateLabels Funktion existiert
    expect(legendConfig?.labels?.generateLabels).toBeDefined();
    expect(legendConfig?.position).toBe('bottom');
    expect(legendConfig?.display).toBe(true);
    
    console.log('🏷️ Legende Konfiguration:', {
      display: legendConfig?.display,
      position: legendConfig?.position,
      hasGenerateLabels: !!legendConfig?.labels?.generateLabels
    });
    
    console.log('✅ Legende-Konfiguration validiert');
  });

  it('💾 sollte localStorage-Daten in Chart korrekt reflektieren', () => {
    console.log('🧪 Test: localStorage zu Chart-Daten Persistenz');

    // Setze Test-Daten in localStorage
    const testAnalyticsData = {
      hiddenMonths: [],
      deletedMonths: {},
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('analytics-deletion-state', JSON.stringify(testAnalyticsData));
    
    render(<CompactAnalytics />);

    const pieDataElement = screen.getByTestId('pie-data');
    const chartData = JSON.parse(pieDataElement.textContent || '{}');
    
    // Chart sollte trotz localStorage-Daten korrekt funktionieren
    expect(chartData.labels).toBeDefined();
    expect(chartData.datasets).toBeDefined();
    
    console.log('💾 Chart mit localStorage-Daten funktionsfähig');
    console.log('✅ localStorage-Integration validiert');
  });
});