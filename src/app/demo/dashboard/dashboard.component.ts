import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { AuthService } from 'src/app/core/services/auth.service';
import { DashboardService } from './dashboard.service';
import { Weather } from './models/weather.model';
import { WelcomeCardComponent } from './components/welcome-card/welcome-card.component';
import { WeatherCardComponent } from './components/weather-card/weather-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule, WelcomeCardComponent, WeatherCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  weather: Weather | null = null;
  loading = false;
  weatherError: string | null = null;
  readonly defaultCity = 'San Jose';
  readonly userName = this.resolveUserName();

  sales = [
    {
      title: 'Clientes Activos',
      amount: '0',
      percentage: '+0%',
      progress: 0,
      progress_bg: 'bg-c-blue',
      icon: 'icon-calendar',
      design: 'col-xl-3 col-md-6'
    },
    {
      title: 'Gestiones Pendientes',
      amount: '0',
      percentage: '0%',
      progress: 0,
      progress_bg: 'bg-c-green',
      icon: 'icon-clock',
      design: 'col-xl-3 col-md-6'
    },
    {
      title: 'Documentos del Dia',
      amount: '0',
      percentage: '0%',
      progress: 0,
      progress_bg: 'bg-c-yellow',
      icon: 'icon-clipboard',
      design: 'col-xl-3 col-md-6'
    },
    {
      title: 'Ingresos del Mes',
      amount: 'CRC 0',
      percentage: '+0%',
      progress: 0,
      progress_bg: 'bg-c-red',
      icon: 'icon-dollar-sign',
      design: 'col-xl-3 col-md-6'
    }
  ];

  private dashboardService = inject(DashboardService);

  ngOnInit() {
    this.initializeMetrics();
    this.bindWeatherState();
    this.dashboardService.loadWeather(this.defaultCity);
  }

  private initializeMetrics() {
    this.sales = this.sales.map((metric) => ({
      ...metric,
      amount: metric.title === 'Ingresos del Mes' ? 'CRC 0' : '0'
    }));
  }

  private bindWeatherState(): void {
    this.dashboardService.weather$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((weather) => {
      this.weather = weather;
    });

    this.dashboardService.loading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => {
      this.loading = loading;
    });

    this.dashboardService.error$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      this.weatherError = error;
    });
  }

  private resolveUserName(): string {
    const user = this.authService.getCurrentUser();
    return String(user?.nombreUsu ?? user?.usuario ?? 'Usuario').trim() || 'Usuario';
  }
}
