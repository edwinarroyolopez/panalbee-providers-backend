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

export enum ProviderEventType {
  WEBSITE_AGREGADO = 'website_agregado',
  WEBSITE_CORREGIDO = 'website_corregido',
  CONTACTO_VERIFICADO = 'contacto_verificado',
  CATALOGO_DETECTADO = 'catalogo_detectado',
  SIN_RESPUESTA = 'sin_respuesta',
  HALLAZGO_MANUAL = 'hallazgo_manual',
  LISTO_PARA_SCRAPING_MANUAL = 'listo_para_scraping_manual',
  NOTA_RELEVANTE_AGREGADA = 'nota_relevante_agregada',
}
