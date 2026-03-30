export enum ProviderStatus {
  INGRESADO = 'ingresado',
  EN_EVALUACION = 'en_evaluacion',
  DESCARTADO = 'descartado',
  APTO_PARA_SCRAPING = 'apto_para_scraping',
  CON_PRODUCTOS_CARGADOS = 'con_productos_cargados',
}

export enum ProviderDecisionType {
  APROBAR = 'aprobar',
  DESCARTAR = 'descartar',
  PRIORIZAR = 'priorizar',
  MARCAR_LISTO_SIGUIENTE_PASO = 'marcar_listo_siguiente_paso',
}
