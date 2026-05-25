import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ComprasInteligentesAlerta } from '../../interfaces/compras-inteligentes-alertas.interface';

@Component({
  selector: 'app-inventory-alert-feed',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inventory-alert-feed.component.html',
  styleUrls: ['./inventory-alert-feed.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryAlertFeedComponent {
  alertas = input.required<ComprasInteligentesAlerta[]>();
  readonly expanded = signal<Record<string, boolean>>({});

  trackAlerta(alerta: ComprasInteligentesAlerta): string {
    return `${alerta.codProducto}-${alerta.codAlmacen}-${alerta.tipoAlerta}`;
  }

  toggleDetalle(alerta: ComprasInteligentesAlerta): void {
    const key = this.trackAlerta(alerta);
    this.expanded.update((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  detalleAbierto(alerta: ComprasInteligentesAlerta): boolean {
    return Boolean(this.expanded()[this.trackAlerta(alerta)]);
  }

  tipoClass(alerta: ComprasInteligentesAlerta): string {
    const normalized = this.normalize(alerta.tipoAlerta);

    if (normalized.includes('SOBRE')) {
      return 'sobreinventario';
    }
    if (normalized.includes('AGOTADO') || normalized.includes('RUPTURA') || normalized.includes('MINIMO')) {
      return 'inventario-minimo';
    }
    if (normalized.includes('PERMANENCIA')) {
      return 'dias-permitidos';
    }
    if (normalized.includes('MARGEN') || normalized.includes('CAPITAL')) {
      return 'dias-permitidos';
    }
    if (normalized.includes('ROTACION') || normalized.includes('CONSUMO') || normalized.includes('MOVIMIENTO')) {
      return 'baja-rotacion';
    }

    return 'inventario-maximo';
  }

  estadoClass(alerta: ComprasInteligentesAlerta): string {
    return this.prioridadClass(alerta);
  }

  prioridadClass(alerta: ComprasInteligentesAlerta): string {
    const normalized = this.normalize(alerta.prioridad);

    if (normalized === 'CRITICA') {
      return 'critica';
    }
    if (normalized === 'ALTA') {
      return 'alta';
    }
    if (normalized === 'MEDIA') {
      return 'media';
    }

    return 'baja';
  }

  tipoLabel(alerta: ComprasInteligentesAlerta): string {
    const normalized = this.normalize(alerta.tipoAlerta);

    if (normalized.includes('AGOTADO')) {
      return 'Producto agotado';
    }
    if (normalized === 'INVENTARIO_MINIMO') {
      return 'Inventario minimo';
    }
    if (normalized === 'INVENTARIO_MAXIMO') {
      return 'Inventario maximo';
    }
    if (normalized === 'EXCESO_PERMANENCIA') {
      return 'Exceso de permanencia';
    }
    if (normalized.includes('RUPTURA')) {
      return 'Riesgo de ruptura';
    }
    if (normalized.includes('SOBRE')) {
      return 'Sobre stock';
    }
    if (normalized.includes('MARGEN')) {
      return 'Margen bajo';
    }
    if (normalized.includes('CAPITAL')) {
      return 'Capital inmovilizado';
    }
    if (normalized.includes('ROTACION') || normalized.includes('CONSUMO') || normalized.includes('MOVIMIENTO')) {
      return 'Baja rotacion';
    }

    return this.toTitleCase(normalized.replace(/_/g, ' '));
  }

  iconClass(alerta: ComprasInteligentesAlerta): string {
    const normalized = this.normalize(alerta.tipoAlerta);

    if (normalized.includes('SOBRE') || normalized.includes('MAXIMO')) {
      return 'feather icon-layers';
    }
    if (normalized.includes('MARGEN') || normalized.includes('CAPITAL')) {
      return 'feather icon-dollar-sign';
    }
    if (normalized.includes('ROTACION') || normalized.includes('CONSUMO') || normalized.includes('MOVIMIENTO')) {
      return 'feather icon-activity';
    }

    return 'feather icon-alert-triangle';
  }

  prioridadLabel(alerta: ComprasInteligentesAlerta): string {
    return this.normalize(alerta.prioridad) || 'SIN PRIORIDAD';
  }

  prioridadTooltip(alerta: ComprasInteligentesAlerta): string {
    const normalized = this.normalize(alerta.prioridad);

    if (normalized === 'CRITICA') {
      return 'Requiere intervencion inmediata para evitar impacto operativo, comercial o financiero severo.';
    }
    if (normalized === 'ALTA') {
      return 'Requiere accion inmediata para evitar impacto operativo/comercial.';
    }
    if (normalized === 'MEDIA') {
      return 'Requiere accion programada para evitar deterioro en el corto plazo.';
    }
    if (normalized === 'BAJA') {
      return 'Requiere seguimiento preventivo; impacto bajo en este momento.';
    }

    return 'Prioridad calculada segun riesgo operativo, impacto en inventario y comportamiento reciente.';
  }

  impactoClass(alerta: ComprasInteligentesAlerta): string {
    const normalized = this.normalize(alerta.nivelImpacto);

    if (normalized === 'FINANCIERO') {
      return 'financiero';
    }
    if (normalized === 'COMERCIAL') {
      return 'comercial';
    }
    if (normalized === 'MIXTO') {
      return 'mixto';
    }

    return 'operacional';
  }

  impactoLabel(alerta: ComprasInteligentesAlerta): string {
    return this.normalize(alerta.nivelImpacto) || 'OPERACIONAL';
  }

  saludLabel(alerta: ComprasInteligentesAlerta): string {
    const estado = this.normalizeInventoryText(alerta.saludInventario || alerta.estadoRotacion);

    if (estado.includes('AGOTADO')) {
      return 'Agotado';
    }
    if (estado.includes('SOBRE')) {
      return 'Sobre stock';
    }
    if (estado.includes('CRITICO')) {
      return 'Critico';
    }
    if (estado.includes('RIESGO')) {
      return 'Riesgo alto';
    }
    if (estado.includes('LENTA') || estado.includes('BAJA')) {
      return 'Baja rotacion';
    }
    if (estado.includes('NORMAL') || estado.includes('SALUDABLE')) {
      return 'Estable';
    }

    return estado ? this.toTitleCase(estado.replace(/_/g, ' ')) : 'Sin estado';
  }

  insightLabel(alerta: ComprasInteligentesAlerta): string {
    const tipo = this.normalize(alerta.tipoAlerta);
    const estado = this.normalize(alerta.estadoRotacion || alerta.saludInventario);

    if (tipo.includes('AGOTADO')) {
      return alerta.consumoPromedioDiario > 0
        ? 'Producto agotado con consumo activo. Revisar reposicion inmediata.'
        : 'Producto agotado. Validar necesidad real antes de reponer.';
    }
    if (tipo.includes('MINIMO')) {
      return `Stock en minimo operativo. Actual: ${this.formatNumber(alerta.stockActual)} / minimo: ${this.formatNumber(alerta.inventarioMinimo)}.`;
    }
    if (tipo.includes('MAXIMO')) {
      return `Stock sobre maximo definido. Actual: ${this.formatNumber(alerta.stockActual)} / maximo: ${this.formatNumber(alerta.inventarioMaximo)}.`;
    }
    if (tipo.includes('PERMANENCIA')) {
      return `Producto con permanencia extendida: ${this.formatNumber(alerta.diasInventario)} dias en inventario.`;
    }
    if (tipo.includes('RUPTURA')) {
      return 'Riesgo de ruptura. Priorizar abastecimiento antes de perder venta.';
    }
    if (tipo.includes('SOBRE')) {
      return `Inventario inmovilizado por ${this.formatNumber(alerta.diasInventario)} dias. Evaluar compra, promocion o traslado.`;
    }
    if (tipo.includes('MARGEN')) {
      return 'Margen bajo. Revisar precio, costo o negociacion con proveedor.';
    }
    if (tipo.includes('CAPITAL')) {
      return 'Capital detenido en inventario. Analizar rotacion y nivel de compra.';
    }
    if (tipo.includes('ROTACION') || tipo.includes('SIN_VENTA') || tipo.includes('MOVIMIENTO') || estado.includes('LENTA')) {
      return `Producto sin traccion en el periodo analizado. Ultima venta hace ${this.formatNumber(alerta.diasSinVenta)} dias.`;
    }

    return alerta.mensaje || 'Alerta operativa detectada. Revisar impacto y accion recomendada.';
  }

  scoreLabel(alerta: ComprasInteligentesAlerta): string {
    return `${this.score(alerta)} / 100`;
  }

  score(alerta: ComprasInteligentesAlerta): number {
    const value = Number(alerta.scorePrioridad);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
  }

  scoreClass(alerta: ComprasInteligentesAlerta): string {
    const score = this.score(alerta);
    if (score >= 90) {
      return 'critico';
    }
    if (score >= 75) {
      return 'alto';
    }
    if (score >= 50) {
      return 'medio';
    }
    return 'bajo';
  }

  resumenRapido(alerta: ComprasInteligentesAlerta): string {
    const capital = `${this.formatCompactCurrency(alerta.valorInventarioEstimado)} inmovilizados`;
    const diasSinVenta = `ultima venta hace ${this.formatNumber(alerta.diasSinVenta)} dias`;
    const rotacion = alerta.estadoRotacion || alerta.saludInventario || 'Rotacion sin clasificar';

    return `${capital} · ${diasSinVenta} · ${this.toTitleCase(this.normalizeInventoryText(rotacion).replace(/_/g, ' '))}`;
  }

  periodoLabel(alerta: ComprasInteligentesAlerta): string {
    const dias = Number(alerta.diasAnalisis);
    const ventana = Number.isFinite(dias) && dias > 0 ? `${dias} dias` : 'Periodo';
    const rango = this.formatDateRange(alerta.fechaDesdeAnalisis, alerta.fechaHastaAnalisis);

    return rango ? `${ventana} · ${rango}` : ventana;
  }

  metricasPrincipales(alerta: ComprasInteligentesAlerta): Array<{ label: string; value: string; tone: string }> {
    const tipo = this.normalize(alerta.tipoAlerta);

    if (tipo.includes('AGOTADO') || tipo.includes('RUPTURA') || tipo.includes('MINIMO')) {
      return [
        { label: 'Stock actual', value: this.formatNumber(alerta.stockActual), tone: 'inventory' },
        { label: 'Inventario minimo', value: this.formatNumber(alerta.inventarioMinimo), tone: 'inventory' },
        { label: 'Consumo diario', value: this.formatNumber(alerta.consumoPromedioDiario, 2), tone: 'commercial' }
      ];
    }

    if (tipo.includes('SOBRE') || tipo.includes('MAXIMO')) {
      return [
        { label: 'Stock actual', value: this.formatNumber(alerta.stockActual), tone: 'inventory' },
        { label: 'Inventario maximo', value: this.formatNumber(alerta.inventarioMaximo), tone: 'inventory' },
        { label: 'Capital inmovilizado', value: this.formatCompactCurrency(alerta.valorInventarioEstimado), tone: 'finance' }
      ];
    }

    if (tipo.includes('PERMANENCIA')) {
      return [
        { label: 'Dias inventario', value: `${this.formatNumber(alerta.diasInventario)} dias`, tone: 'inventory' },
        { label: 'Capital inmovilizado', value: this.formatCompactCurrency(alerta.valorInventarioEstimado), tone: 'finance' },
        { label: 'Ultima compra', value: this.formatDateLabel(alerta.ultimaCompra), tone: 'commercial' }
      ];
    }

    if (tipo.includes('MARGEN')) {
      return [
        { label: 'Venta periodo', value: this.formatCompactCurrency(alerta.ventaNeta), tone: 'finance' },
        { label: 'Utilidad', value: this.formatCompactCurrency(alerta.utilidadBrutaTotal), tone: 'finance' },
        { label: 'Margen', value: `${this.formatNumber(alerta.margenPorcentaje, 1)}%`, tone: 'margin' }
      ];
    }

    if (tipo.includes('ROTACION') || tipo.includes('SIN_VENTA') || tipo.includes('MOVIMIENTO') || tipo.includes('CONSUMO')) {
      return [
        { label: 'Dias inventario', value: this.formatNumber(alerta.diasInventario), tone: 'inventory' },
        { label: 'Consumo diario', value: this.formatNumber(alerta.consumoPromedioDiario, 2), tone: 'commercial' },
        { label: 'Ultima venta', value: `${this.formatNumber(alerta.diasSinVenta)} dias`, tone: 'commercial' }
      ];
    }

    return [
      { label: 'Stock actual', value: this.formatNumber(alerta.stockActual), tone: 'inventory' },
      { label: 'Venta periodo', value: this.formatCompactCurrency(alerta.ventaNeta), tone: 'finance' },
      { label: 'Score', value: this.scoreLabel(alerta), tone: 'score' }
    ];
  }

  detalleFinanciero(alerta: ComprasInteligentesAlerta): Array<{ label: string; value: string }> {
    return [
      { label: 'Venta periodo', value: this.formatCompactCurrency(alerta.ventaNeta) },
      { label: 'Costo periodo', value: this.formatCompactCurrency(alerta.costoVentaTotal) },
      { label: 'Utilidad', value: this.formatCompactCurrency(alerta.utilidadBrutaTotal) },
      { label: 'Margen', value: `${this.formatNumber(alerta.margenPorcentaje, 1)}%` },
      { label: 'Capital', value: this.formatCompactCurrency(alerta.valorInventarioEstimado) }
    ];
  }

  detalleInventario(alerta: ComprasInteligentesAlerta): Array<{ label: string; value: string }> {
    return [
      { label: 'Stock actual', value: this.formatNumber(alerta.stockActual) },
      { label: 'Inventario minimo', value: this.formatNumber(alerta.inventarioMinimo) },
      { label: 'Inventario maximo', value: this.formatNumber(alerta.inventarioMaximo) },
      { label: 'Dias inventario', value: this.formatNumber(alerta.diasInventario) }
    ];
  }

  detalleComercial(alerta: ComprasInteligentesAlerta): Array<{ label: string; value: string }> {
    return [
      { label: 'Consumo diario', value: this.formatNumber(alerta.consumoPromedioDiario, 2) },
      { label: 'Rotacion mensual', value: this.formatNumber(alerta.rotacionMensual, 2) },
      { label: 'Rotacion', value: this.saludLabel(alerta) },
      { label: 'Ultima venta', value: `${this.formatNumber(alerta.diasSinVenta)} dias` }
    ];
  }

  tieneMargenNegativo(alerta: ComprasInteligentesAlerta): boolean {
    return Number(alerta.margenPorcentaje) < 0;
  }

  tieneInventarioAlto(alerta: ComprasInteligentesAlerta): boolean {
    return Number(alerta.diasInventario) >= 90;
  }

  estaAgotado(alerta: ComprasInteligentesAlerta): boolean {
    return Number(alerta.stockActual) <= 0;
  }

  esCriticaPorScore(alerta: ComprasInteligentesAlerta): boolean {
    return this.score(alerta) >= 90;
  }

  formatCompactCurrency(value: number | null | undefined): string {
    if (value === undefined || value === null) {
      return '-';
    }

    const absolute = Math.abs(value);
    if (absolute >= 1_000_000) {
      return `₡${(value / 1_000_000).toFixed(1)}M`;
    }
    if (absolute >= 1_000) {
      return `₡${(value / 1_000).toFixed(0)}k`;
    }

    return `₡${value.toFixed(0)}`;
  }

  formatNumber(value: number | null | undefined, digits = 0): string {
    if (value === undefined || value === null) {
      return '-';
    }

    return value.toLocaleString('es-CR', {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    });
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toUpperCase();
  }

  private normalizeInventoryText(value: string | null | undefined): string {
    return this.normalize(value).replace(/^\?+\s*/, '').trim();
  }

  private formatDateRange(fechaDesde: string | null | undefined, fechaHasta: string | null | undefined): string {
    const desde = this.formatDate(fechaDesde);
    const hasta = this.formatDate(fechaHasta);

    if (desde && hasta) {
      return `${desde} al ${hasta}`;
    }

    return desde || hasta;
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private formatDateLabel(value: string | null | undefined): string {
    return this.formatDate(value) || '-';
  }
}
