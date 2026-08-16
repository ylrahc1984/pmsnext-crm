import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoConsulta, ReporteFila } from '../../interfaces/compras-reportes.interface';

@Component({
  selector: 'app-compras-reporte-tabla',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reporte-tabla.component.html',
  styleUrls: ['./reporte-tabla.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReporteTablaComponent {
  readonly estado = input.required<EstadoConsulta>();
  readonly filas = input.required<readonly ReporteFila[]>();
  readonly mensajeInicial = input('Seleccione los filtros requeridos para iniciar la consulta.');
  readonly mensajeError = input<string | null>(null);

  readonly columnas = computed(() => Object.keys(this.filas()[0] ?? {}).slice(0, 14));

  valor(fila: ReporteFila, columna: string): string | number | boolean | null {
    return fila[columna];
  }
}

