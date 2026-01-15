'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface CarrierRateChartProps {
  carrierId: string;
}

interface RateData {
  date: string;
  rate: number;
  lane?: string;
}

export function CarrierRateChart({ carrierId }: CarrierRateChartProps) {
  const [rateHistory, setRateHistory] = useState<RateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRateHistory();
  }, [carrierId]);

  const fetchRateHistory = async () => {
    try {
      // Fetch carrier interactions with rate data
      const response = await fetch(`/api/carriers/${carrierId}/interactions`);
      const interactions = await response.json();

      // Extract rate history from interactions
      const rates = interactions
        .filter((i: any) => i.rate_discussed)
        .map((i: any) => ({
          date: i.interaction_date,
          rate: i.rate_discussed,
          lane: i.lane_discussed,
        }))
        .sort((a: RateData, b: RateData) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      setRateHistory(rates);
    } catch (error) {
      console.error('Error fetching rate history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rateHistory.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Not enough data to display chart (minimum 2 data points required)
        </p>
      </div>
    );
  }

  const chartData = {
    labels: rateHistory.map(r => format(new Date(r.date), 'MMM d')),
    datasets: [
      {
        label: 'Rate',
        data: rateHistory.map(r => r.rate),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Rate Trend',
        font: {
          size: 14,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const rate = context.parsed.y;
            const dataIndex = context.dataIndex;
            const lane = rateHistory[dataIndex].lane;
            return [
              `Rate: $${rate.toLocaleString()}`,
              lane ? `Lane: ${lane}` : '',
            ].filter(Boolean);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
}