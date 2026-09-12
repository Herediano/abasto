/** Explicación del módulo Ajustes para el botón "?" — ver `ModuleScreen`. */
export function AjustesHelp() {
  return (
    <>
      <p>Tu cuenta, la empresa, el equipo y los rangos de permisos.</p>
      <div>
        <h4>Mi cuenta</h4>
        <p>Perfil, contraseña, tema y preferencias — se guardan en este dispositivo. También las sesiones abiertas: se puede alternar entre cuentas sin volver a escribir la contraseña.</p>
      </div>
      <div>
        <h4>La empresa</h4>
        <p>Datos de la empresa, condición fiscal, sucursales (cada una nace con un depósito y una caja) y tarjetas de crédito guardadas para el cobro en cuotas. Sólo lo ve y cambia el Dueño.</p>
      </div>
      <div>
        <h4>Usuarios</h4>
        <p>Quién entra al sistema y con qué rango.</p>
      </div>
      <div>
        <h4>Rangos</h4>
        <p>Qué puede tocar cada rango de la empresa. Los permisos sensibles van marcados.</p>
      </div>
    </>
  );
}
