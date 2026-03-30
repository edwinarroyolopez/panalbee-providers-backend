export enum ProductStatus {
  CARGADO = 'cargado',
  PRIORIZADO = 'priorizado',
  DESCARTADO = 'descartado',
  APROBADO = 'aprobado',
  LISTO_PARA_EXPORTAR = 'listo_para_exportar',
  EXPORTADO = 'exportado',
}

export enum ProductDecisionType {
  APROBAR = 'aprobar',
  DESCARTAR = 'descartar',
  PRIORIZAR = 'priorizar',
  MARCAR_LISTO_SIGUIENTE_PASO = 'marcar_listo_siguiente_paso',
}
