(function () {
    'use strict';

    var API = 'api/index.php';

    var estado = {
        vista: 'inicio',
        parametros: { capacidad_bus: 55, asientos_personal: 2, orden_pasajeros: 'inscripcion' },
        viajeActual: null,
        viajeDetalle: null,
        mapa: null,
        asientoSeleccionado: null,
        historialAsientos: [],
        enfocarAlta: false,
        enfocarCobro: null,
        programados: [],
        historial: [],
        paseos: [],
        personal: [],
        busquedaPasajeros: '',
        busquedaPaseos: '',
        viajeModalId: null,
        viajeModal: null,
        formPasajero: formPasajeroVacio(),
        temporizadorSugerencias: null,
        advertenciaCodigo: null,
        desborde: null,
        salida: null,
        nuevosNombres: [],
        filtroPaseos: '',
        estadisticas: null,
        periodo: 'anual',
        alumnos: null,
        secciones: [],
        resumenPadron: null,
        totalAlumnos: 0,
        filtroAlumnos: { q: '', anio: '', seccion_id: '' },
        errorPadron: null,
        profesores: null,
        busquedaProfesores: '',
        errorProfesores: null,
        selectorProfesor: null
    };

    var asientoArrastrado = null;
    var viajesAutoCerrados = {};

    var $ = function (selector, contexto) {
        return (contexto || document).querySelector(selector);
    };    var $$ = function (selector, contexto) {
        return Array.prototype.slice.call((contexto || document).querySelectorAll(selector));
    };

    function escapar(valor) {
        return String(valor === null || valor === undefined ? '' : valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function dinero(valor) {
        var numero = Number(valor || 0);
        return '$' + numero.toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Locale para las fechas: cambia con el idioma elegido en la cabecera.
     */
    function localeFechas() {
        return document.documentElement.lang === 'en' ? 'en-US' : 'es-SV';
    }

    function fechaCorta(iso) {
        if (!iso) {
            return '—';
        }
        var partes = iso.split('-');
        return partes[2] + '/' + partes[1] + '/' + partes[0];
    }

    function fechaLarga(iso) {
        if (!iso) {
            return 'Sin fecha';
        }
        var fecha = new Date(iso + 'T00:00:00');
        if (isNaN(fecha.getTime())) {
            return fechaCorta(iso);
        }
        return fecha.toLocaleDateString(localeFechas(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    function hoyIso() {
        var ahora = new Date();
        var mes = String(ahora.getMonth() + 1).padStart(2, '0');
        var dia = String(ahora.getDate()).padStart(2, '0');
        return ahora.getFullYear() + '-' + mes + '-' + dia;
    }

    function iniciales(nombre) {
        var partes = String(nombre || '').trim().split(' ').filter(Boolean);
        if (!partes.length) {
            return '—';
        }
        var primera = partes[0][0] || '';
        var segunda = partes.length > 1 ? partes[1][0] || '' : '';
        return (primera + segunda).toUpperCase();
    }

    function estadoPastilla(estadoViaje) {
        if (estadoViaje === 'finalizado') {
            return '<span class="pastilla neutra sin-punto">Finalizado</span>';
        }
        if (estadoViaje === 'en_curso') {
            return '<span class="pastilla exito">En curso</span>';
        }
        return '<span class="pastilla primaria">Programado</span>';
    }

    function icono(ruta) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ruta + '</svg>';
    }

    var ICONOS = {
        usuarios: '<path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19"></path><circle cx="9" cy="7" r="3.2"></circle><path d="M22 19v-1.5a4 4 0 0 0-3-3.87"></path><path d="M16.5 4.2a3.2 3.2 0 0 1 0 5.9"></path>',
        asientos: '<path d="M5 11V7.5A2.5 2.5 0 0 1 7.5 5h1A2.5 2.5 0 0 1 11 7.5V11"></path><path d="M3 11h18v4a2 2 0 0 1-2 2h-1v3"></path><path d="M6 11V8.5A2.5 2.5 0 0 1 8.5 6"></path>',
        dinero: '<circle cx="12" cy="12" r="8.5"></circle><path d="M14.5 9.2A2.8 2.8 0 0 0 12 8c-1.4 0-2.5.8-2.5 2s1.1 1.8 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2a2.8 2.8 0 0 1-2.5-1.2"></path><path d="M12 6.5v11"></path>',
        docente: '<path d="M12 4 2 9l10 5 10-5-10-5Z"></path><path d="M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"></path>',
        calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"></rect><path d="M3.5 9.5h17M8 3v4M16 3v4"></path>',
        reloj: '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path>',
        lupa: '<circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4 4"></path>',
        mas: '<path d="M12 5v14M5 12h14"></path>',
        lapiz: '<path d="M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4 11.5-11.5Z"></path>',
        bote: '<path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"></path><path d="M6.5 7l.8 12.1A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7"></path>',
        cheque: '<path d="M20 6 9.5 17 4 11.5"></path>',
        alerta: '<path d="M12 9v4.5"></path><path d="M12 17h.01"></path><path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"></path>',
        refrescar: '<path d="M20 11a8 8 0 1 0-.6 4"></path><path d="M20 4v6h-6"></path>',
        raton: '<rect x="6.5" y="3" width="11" height="18" rx="5.5"></rect><path d="M12 3v6"></path>',
        mover: '<path d="M5 9V5h4"></path><path d="M19 15v4h-4"></path><path d="M5 5l5 5"></path><path d="M19 19l-5-5"></path>',
        deshacer: '<path d="M4 10h10a5 5 0 0 1 0 10h-3"></path><path d="M4 10l4-4"></path><path d="M4 10l4 4"></path>',
        cobrar: '<rect x="2.5" y="6" width="19" height="12" rx="2"></rect><circle cx="12" cy="12" r="2.5"></circle><path d="M6 9.5v5"></path><path d="M18 9.5v5"></path>',
        grafico: '<path d="M3.5 20.5h17"></path><rect x="5" y="12" width="3.5" height="6" rx="1"></rect><rect x="10.25" y="8" width="3.5" height="10" rx="1"></rect><rect x="15.5" y="4.5" width="3.5" height="13.5" rx="1"></rect>',
        lista: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"></path><path d="M4 6.5h.01M4 12h.01M4 17.5h.01"></path>',
        cerrar: '<path d="M6 6l12 12M18 6L6 18"></path>'
    };

    function apiGet(recurso, parametros) {
        var url = API + '?r=' + recurso;
        Object.keys(parametros || {}).forEach(function (clave) {
            url += '&' + clave + '=' + encodeURIComponent(parametros[clave]);
        });

        return fetch(url, { headers: { 'Accept': 'application/json' } }).then(leerRespuesta);
    }

    function apiPost(recurso, datos, accion, parametros) {
        var url = API + '?r=' + recurso + (accion ? '&action=' + accion : '');

        Object.keys(parametros || {}).forEach(function (clave) {
            url += '&' + clave + '=' + encodeURIComponent(parametros[clave]);
        });

        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(datos || {})
        }).then(leerRespuesta);
    }

    function leerRespuesta(respuesta) {
        return respuesta.json().then(function (cuerpo) {
            if (!cuerpo.ok) {
                var error = new Error(cuerpo.error ? cuerpo.error.mensaje : 'Ocurrió un error inesperado.');
                error.codigo = cuerpo.error ? cuerpo.error.codigo : 'error';
                error.detalles = cuerpo.error ? cuerpo.error.detalles : {};
                throw error;
            }
            return cuerpo;
        });
    }

    function aviso(titulo, mensaje, tipo) {
        var contenedor = $('#avisos');
        var nodo = document.createElement('div');
        nodo.className = 'aviso ' + (tipo || '');
        nodo.innerHTML = '<strong>' + escapar(titulo) + '</strong>' + (mensaje ? '<span>' + escapar(mensaje) + '</span>' : '');
        contenedor.appendChild(nodo);

        window.setTimeout(function () {
            nodo.classList.add('saliendo');
            window.setTimeout(function () {
                nodo.remove();
            }, 200);
        }, 4200);
    }

    function modal(titulo, subtitulo, contenido, pie, ancho) {
        $('#modal-sobretitulo').textContent = subtitulo || '';
        $('#modal-titulo').textContent = titulo;
        $('#modal-cuerpo').innerHTML = contenido;
        $('#modal-pie').innerHTML = pie || '';
        $('#capa-modal').hidden = false;
        $('.modal').classList.toggle('ancho', Boolean(ancho));
        document.body.style.overflow = 'hidden';
    }

    function cerrarModal() {
        cerrarSelector();
        $('#capa-modal').hidden = true;
        $('#modal-cuerpo').innerHTML = '';
        $('#modal-pie').innerHTML = '';
        $('#modal-titulo').textContent = '';
        $('#modal-sobretitulo').textContent = '';
        estado.viajeModalId = null;
        estado.viajeModal = null;
        estado.advertenciaCodigo = null;
        estado.desborde = null;
        estado.salida = null;
        document.body.style.overflow = '';
    }

    /**
     * Ventana secundaria: se abre encima de un formulario para elegir un registro
     * de una lista larga (profesores del catálogo, alumnos del padrón).
     */
    function abrirSelector(titulo, subtitulo, contenido, pie) {
        $('#seleccion-sobretitulo').textContent = subtitulo || '';
        $('#seleccion-titulo').textContent = titulo;
        $('#seleccion-cuerpo').innerHTML = contenido;
        $('#seleccion-pie').innerHTML = pie || '';
        $('#capa-seleccion').hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function cerrarSelector() {
        if ($('#capa-seleccion').hidden) {
            return;
        }

        $('#capa-seleccion').hidden = true;
        $('#seleccion-cuerpo').innerHTML = '';
        $('#seleccion-pie').innerHTML = '';
        $('#seleccion-titulo').textContent = '';
        $('#seleccion-sobretitulo').textContent = '';
        estado.selectorProfesor = null;

        if ($('#capa-modal').hidden) {
            document.body.style.overflow = '';
        }
    }

    function selectorAbierto() {
        return !$('#capa-seleccion').hidden;
    }

    /**
     * Catálogo de profesores para el paseo: activos, más el que ya está vinculado
     * aunque hoy esté inactivo, para no perderlo sin querer.
     */
    function profesoresDelSelector() {
        var contexto = estado.selectorProfesor || {};
        var busqueda = (contexto.busqueda || '').toLowerCase().trim();
        var actual = contexto.actual || 0;

        return (estado.profesores || []).filter(function (profesor) {
            if (profesor.activo !== 1 && profesor.id !== actual) {
                return false;
            }

            if (!busqueda) {
                return true;
            }

            var heno = (profesor.nombre + ' ' + (profesor.especialidad_cargo || '') + ' ' + (profesor.codigo || '')).toLowerCase();
            return heno.indexOf(busqueda) !== -1;
        });
    }

    function pintarListaProfesores() {
        var contenedor = $('#lista-profesores');

        if (!contenedor) {
            return;
        }

        var actual = (estado.selectorProfesor || {}).actual || 0;
        var lista = profesoresDelSelector();

        if (!lista.length) {
            contenedor.innerHTML = '<p class="fila-seleccion-vacia">Ningún docente coincide con la búsqueda.</p>';
            return;
        }

        contenedor.innerHTML = '<ul class="lista-seleccion" role="listbox" aria-label="Profesores">' +
            lista.map(function (profesor) {
                var cargo = profesor.especialidad_cargo ? profesor.especialidad_cargo : 'Sin cargo registrado';

                return '<li><button type="button" class="fila-seleccion" role="option" aria-selected="' +
                    (profesor.id === actual ? 'true' : 'false') + '"' +
                    ' data-accion="seleccionar-profesor" data-id="' + profesor.id + '"' +
                    ' data-nombre="' + escapar(profesor.nombre) + '" data-meta="' + escapar(cargo) + '">' +
                    '<span class="inicial-persona">' + escapar(iniciales(profesor.nombre)) + '</span>' +
                    '<span class="fila-seleccion-datos">' +
                    '<span class="fila-seleccion-nombre">' + escapar(profesor.nombre) + '</span>' +
                    '<span class="fila-seleccion-meta">' + escapar(cargo) +
                    (profesor.activo !== 1 ? ' · Inactivo' : '') + '</span>' +
                    '</span></button></li>';
            }).join('') + '</ul>';
    }

    function abrirSelectorProfesor() {
        var valor = $('#paseo-profesor-id');
        var texto = $('#paseo-profesor-valor');

        estado.selectorProfesor = {
            busqueda: '',
            actual: valor ? Number(valor.value || 0) : 0,
            nombre: texto ? texto.textContent : ''
        };

        var contenido = '<div class="seleccion-buscador"><div class="buscador">' + icono(ICONOS.lupa) +
            '<input type="search" class="control" id="busqueda-profesor" autocomplete="off"' +
            ' placeholder="Buscar por nombre, cargo o código"></div></div>' +
            '<div id="lista-profesores"></div>';

        var pie = '<span class="texto-apagado nota-pequena">Elige un docente de la lista</span>' +
            '<div class="grupo-botones">' +
            '<button type="button" class="boton boton-borde" data-accion="cerrar-selector">Cancelar</button></div>';

        abrirSelector('Profesor a cargo', 'Catálogo de profesores', contenido, pie);
        pintarListaProfesores();

        var campo = $('#busqueda-profesor');

        if (campo) {
            campo.focus();
        }
    }

    function elegirProfesor(id, nombre, meta) {
        var campoId = $('#paseo-profesor-id');
        var campoTexto = $('#paseo-profesor-encargado');
        var campoValor = $('#paseo-profesor-valor');

        if (campoId) {
            campoId.value = id ? String(id) : '';
        }

        // Con el profesor elegido el nombre sale del catálogo, así que el texto
        // suelto que pudiera arrastrar el paseo deja de tener sentido.
        if (campoTexto) {
            campoTexto.value = '';
        }

        if (campoValor) {
            campoValor.textContent = id ? nombre + (meta ? ' · ' + meta : '') : 'Sin profesor asignado';
            campoValor.classList.toggle('sin-valor', !id);
        }

        cerrarSelector();
    }

    function cargarPanel(mensajeCarga) {
        var contenedor = $('#contenido');
        if (mensajeCarga) {
            contenedor.innerHTML = '<div class="cargando"><span class="cargando-barra"></span><p>' + escapar(mensajeCarga) + '</p></div>';
        }

        return apiGet('panel').then(function (respuesta) {
            estado.parametros = respuesta.datos.parametros;
            estado.viajeActual = respuesta.datos.viaje_actual;
            estado.viajeDetalle = respuesta.datos.viaje_detalle;
            estado.mapa = respuesta.datos.mapa_asientos;
            estado.programados = respuesta.datos.programados;
            estado.historial = respuesta.datos.historial;
            estado.paseos = respuesta.datos.paseos;
            estado.personal = respuesta.datos.personal;
            render();
        }).catch(function (error) {
            contenedor.innerHTML = '<section class="tarjeta estado-sin-base"><h1 class="titulo-seccion">No se pudo cargar la información</h1>' +
                '<p class="texto-apagado">' + escapar(error.message) + '</p>' +
                '<p class="texto-apagado">Comprueba que MySQL esté encendido. Para preparar la base de datos ejecuta <strong>php bin/rideroster instalar</strong> desde la carpeta del proyecto: no borra los datos que ya tengas.</p>' +
                '<div class="acciones-vista">' +
                '<button type="button" class="boton boton-primario" data-accion="recargar">Reintentar</button>' +
                '</div></section>';
        });
    }

    function refrescarFondo() {
        return apiGet('panel').then(function (respuesta) {
            estado.parametros = respuesta.datos.parametros;
            estado.viajeActual = respuesta.datos.viaje_actual;
            estado.viajeDetalle = respuesta.datos.viaje_detalle;
            estado.mapa = respuesta.datos.mapa_asientos;
            estado.programados = respuesta.datos.programados;
            estado.historial = respuesta.datos.historial;
            estado.paseos = respuesta.datos.paseos;
            estado.personal = respuesta.datos.personal;
            render();
        }).catch(function () {
            return null;
        });
    }

    var peticionEstadisticas = 0;

    function cargarEstadisticas(limpiar) {
        var token = ++peticionEstadisticas;

        if (limpiar) {
            estado.estadisticas = null;

            if (estado.vista === 'estadisticas') {
                render();
            }
        }

        return apiGet('estadisticas', { periodo: estado.periodo }).then(function (respuesta) {
            if (token !== peticionEstadisticas) {
                return;
            }

            estado.estadisticas = respuesta.datos;

            if (estado.vista === 'estadisticas') {
                render();
            }
        }).catch(function (error) {
            if (token !== peticionEstadisticas) {
                return;
            }

            estado.estadisticas = { error: error.message };

            if (estado.vista === 'estadisticas') {
                render();
            }
        });
    }

    /**
     * Copia el padrón recibido del API al estado de la vista.
     */
    function aplicarPadron(datos) {
        estado.alumnos = datos.alumnos;
        estado.secciones = datos.secciones;
        estado.resumenPadron = datos.resumen;
        estado.totalAlumnos = datos.total;
    }

    /**
     * Carga el padrón completo (alumnos, secciones y resumen). Solo se pide al
     * servidor cuando hace falta: después se filtra y agrupa en el navegador.
     *
     * @param {boolean} limpiar true para volver a pedirlo (recargar o guardar).
     */
    function cargarPadron(limpiar) {
        if (limpiar) {
            estado.alumnos = null;
            estado.errorPadron = null;

            if (estado.vista === 'alumnos') {
                render();
            }
        }

        if (estado.alumnos) {
            return Promise.resolve();
        }

        return apiGet('alumnos').then(function (respuesta) {
            aplicarPadron(respuesta.datos);
            estado.errorPadron = null;

            if (estado.vista === 'alumnos') {
                render();
            }
        }).catch(function (error) {
            estado.alumnos = [];
            estado.errorPadron = error.message;

            if (estado.vista === 'alumnos') {
                render();
            }
        });
    }

    /**
     * Carga el catálogo de profesores, que alimenta la vista de Profesores y
     * el selector de profesor de cada paseo.
     */
    function cargarProfesores(limpiar) {
        if (limpiar) {
            estado.profesores = null;
            estado.errorProfesores = null;

            if (estado.vista === 'profesores') {
                render();
            }
        }

        if (estado.profesores) {
            return Promise.resolve();
        }

        return apiGet('profesores').then(function (respuesta) {
            estado.profesores = respuesta.datos;
            estado.errorProfesores = null;

            if (estado.vista === 'profesores') {
                render();
            }
        }).catch(function (error) {
            estado.profesores = [];
            estado.errorProfesores = error.message;

            if (estado.vista === 'profesores') {
                render();
            }
        });
    }

    function render() {
        var contenedor = $('#contenido');

        if (estado.vista === 'estadisticas') {
            contenedor.innerHTML = vistaEstadisticas();
        } else if (estado.vista === 'administracion') {
            contenedor.innerHTML = vistaAdministracion();
        } else if (estado.vista === 'alumnos') {
            contenedor.innerHTML = vistaAlumnos();
        } else if (estado.vista === 'profesores') {
            contenedor.innerHTML = vistaProfesores();
        } else {
            contenedor.innerHTML = vistaInicio();
        }

        actualizarEstadoSistema();
        actualizarTemporizador();
    }

    function actualizarEstadoSistema() {
        var indicador = $('#estado-sistema');
        var texto = $('#estado-sistema-texto');

        if (!indicador || !texto) {
            return;
        }

        if (estado.viajeActual) {
            indicador.className = 'etiqueta-sistema';
            texto.textContent = 'Viaje activo';
            return;
        }

        indicador.className = 'etiqueta-sistema sin-viaje';
        texto.textContent = 'Sin viaje activo';
    }

    function formatearCuentaAtras(milisegundos) {
        var total = Math.max(0, Math.floor(milisegundos / 1000));
        var dias = Math.floor(total / 86400);
        var horas = Math.floor((total % 86400) / 3600);
        var minutos = Math.floor((total % 3600) / 60);
        var segundos = total % 60;

        var reloj = [horas, minutos, segundos].map(function (bloque) {
            return String(bloque).padStart(2, '0');
        }).join(':');

        return dias > 0 ? dias + ' d ' + reloj : reloj;
    }

    function actualizarTemporizador() {
        var contenedor = $('#temporizador');

        if (!contenedor) {
            return;
        }

        var viaje = estado.viajeDetalle || estado.viajeActual;

        if (!viaje || !viaje.fecha || viaje.estado === 'finalizado') {
            contenedor.hidden = true;
            return;
        }

        var destino = new Date(viaje.fecha + 'T' + (viaje.hora_salida || '00:00') + ':00');

        if (isNaN(destino.getTime())) {
            contenedor.hidden = true;
            return;
        }

        var diferencia = destino.getTime() - Date.now();
        var unDia = 24 * 60 * 60 * 1000;

        // El contador se enciende un día antes de la salida.
        if (diferencia > unDia) {
            contenedor.hidden = true;
            return;
        }

        contenedor.hidden = false;
        contenedor.className = 'temporizador' +
            (diferencia < 0 ? ' salio' : (diferencia <= 60 * 60 * 1000 ? ' urgente' : ''));

        $('#temporizador-etiqueta').textContent = diferencia < 0 ? 'Salida hace' : 'Faltan';
        $('#temporizador-valor').textContent = formatearCuentaAtras(Math.abs(diferencia));
    }

    /**
     * Si el viaje ya cerró boletos y su hora estimada de regreso pasó, se pide
     * al servidor que lo finalice (lo hace en la siguiente carga del panel).
     * Solo se dispara una vez por viaje para no repetir peticiones.
     */
    function revisarCierreAutomatico() {
        var viaje = estado.viajeDetalle;

        if (!viaje || !viaje.boletos_cerrados || viaje.estado === 'finalizado' || !viaje.fecha) {
            return;
        }

        var limite = new Date(viaje.fecha + 'T' + (viaje.hora_retorno || '23:59') + ':00');

        if (isNaN(limite.getTime()) || limite.getTime() > Date.now() || viajesAutoCerrados[viaje.id]) {
            return;
        }

        viajesAutoCerrados[viaje.id] = true;
        refrescarFondo();
    }

    function marcarFechaEnVivo() {
        var campo = $('#fecha-hoy');

        if (!campo) {
            return;
        }

        var texto = new Date().toLocaleDateString(localeFechas(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        if (campo.textContent !== texto) {
            campo.textContent = texto;
        }
    }

    function tarjetasMetricas(lista) {
        return lista.map(function (metrica) {
            return '<article class="metrica">' +
                '<div class="metrica-cabecera"><span class="metrica-etiqueta">' + escapar(metrica.etiqueta) + '</span>' +
                '<span class="metrica-icono ' + (metrica.clase || '') + '">' + icono(metrica.icono) + '</span></div>' +
                '<div class="metrica-valor numero">' + escapar(metrica.valor) + '</div>' +
                '<div class="metrica-detalle">' + escapar(metrica.detalle) + '</div>' +
                '</article>';
        }).join('');
    }

    function metricasViaje(viaje) {
        if (!viaje) {
            return '';
        }

        return tarjetasMetricas([
            {
                etiqueta: 'Estudiantes',
                valor: String(viaje.pasajeros),
                detalle: viaje.acompanantes > 0
                    ? viaje.acompanantes + (viaje.acompanantes === 1 ? ' viaja con encargado' : ' viajan con encargado')
                    : 'estudiantes inscritos',
                icono: ICONOS.usuarios
            },
            {
                etiqueta: 'Cupos disponibles',
                valor: String(viaje.cupos_disponibles),
                detalle: 'de ' + (viaje.capacidad_bus - viaje.asientos_personal) + ' asientos disponibles',
                icono: ICONOS.asientos
            },
            {
                etiqueta: 'Recaudado',
                valor: dinero(viaje.recaudado),
                detalle: viaje.pendiente > 0
                    ? dinero(viaje.pendiente) + ' por cobrar de ' + dinero(viaje.esperado)
                    : 'cobro completo: ' + dinero(viaje.esperado),
                icono: ICONOS.dinero,
                clase: 'verde'
            },
            {
                etiqueta: 'Personal a bordo',
                valor: String(viaje.personal),
                detalle: 'docentes y personal de asistencia',
                icono: ICONOS.docente,
                clase: 'ambar'
            }
        ]);
    }

    function estaSeleccionado(ocupante) {
        return Boolean(estado.asientoSeleccionado)
            && estado.asientoSeleccionado.pasajero_id === ocupante.pasajero_id
            && estado.asientoSeleccionado.tipo === ocupante.tipo;
    }

    function numeroButaca(numero, porNumero) {
        if (!numero) {
            return '<span class="butaca vacia" aria-hidden="true"></span>';
        }

        var ocupante = porNumero[numero];

        if (!ocupante) {
            var claseLibre = 'butaca libre';
            var atributos = ' data-asiento="' + numero + '"';

            if (estado.asientoSeleccionado) {
                claseLibre += ' disponible';
                atributos += ' data-accion="soltar-en-asiento" data-pasajero-id="' + estado.asientoSeleccionado.pasajero_id +
                    '" data-rol="' + estado.asientoSeleccionado.tipo + '"';
            }

            return '<button type="button" class="' + claseLibre + '"' + atributos +
                ' title="Asiento ' + numero + ' · Libre">' + numero + '</button>';
        }

        var clases = 'butaca ocupada' + (ocupante.tipo === 'tutor' ? ' tutor' : '') +
            (estaSeleccionado(ocupante) ? ' seleccionada' : '');

        var etiqueta = ocupante.tipo === 'tutor'
            ? 'Acompañante de ' + ocupante.acompanado_de
            : ocupante.nombre + (ocupante.codigo ? ' · ' + ocupante.codigo : '');

        return '<button type="button" class="' + clases + '" draggable="true" data-accion="seleccionar-asiento"' +
            ' data-asiento="' + numero + '"' +
            ' data-pasajero-id="' + ocupante.pasajero_id + '" data-rol="' + ocupante.tipo + '"' +
            ' title="Asiento ' + numero + ' · ' + escapar(etiqueta) + '">' +
            '<span class="butaca-texto">' + iniciales(ocupante.nombre) + '</span>' +
            '<span class="butaca-numero">' + numero + '</span>' +
            '</button>';
    }

    function viajeIdActual() {
        return estado.viajeDetalle ? estado.viajeDetalle.id : 0;
    }

    function ocupanteSeleccionado() {
        if (!estado.mapa || !estado.asientoSeleccionado) {
            return null;
        }

        for (var i = 0; i < estado.mapa.ocupantes.length; i++) {
            var ocupante = estado.mapa.ocupantes[i];

            if (ocupante.pasajero_id === estado.asientoSeleccionado.pasajero_id
                && ocupante.tipo === estado.asientoSeleccionado.tipo) {
                return ocupante;
            }
        }

        return null;
    }

    function barraInstruccion() {
        var seleccionado = ocupanteSeleccionado();

        if (!seleccionado) {
            return '<div class="mapa-instruccion">' +
                '<span class="instruccion-icono">' + icono(ICONOS.raton) + '</span>' +
                '<span class="instruccion-texto">Arrastra a un estudiante hasta la butaca que quieras, o haz clic en él y luego en el asiento de destino.</span>' +
                '</div>';
        }

        return '<div class="mapa-instruccion activa">' +
            '<span class="instruccion-icono">' + icono(ICONOS.mover) + '</span>' +
            '<span class="instruccion-texto">Moviendo a <strong>' + escapar(seleccionado.nombre) + '</strong>' +
            (seleccionado.codigo ? ' (' + escapar(seleccionado.codigo) + ')' : '') +
            '. Elige el asiento de destino o pulsa <kbd>Esc</kbd> para cancelar.</span>' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="cancelar-seleccion">Cancelar</button>' +
            '</div>';
    }

    function renderMapaAsientos() {
        var mapa = estado.mapa;

        if (!mapa) {
            return '';
        }

        var porNumero = {};

        mapa.ocupantes.forEach(function (ocupante) {
            porNumero[ocupante.numero] = ocupante;
        });

        var filas = [];
        var fila = [];

        for (var numero = 1; numero <= mapa.lugares; numero++) {
            fila.push(numero);

            if (fila.length === 4) {
                filas.push(fila);
                fila = [];
            }
        }

        if (fila.length) {
            filas.push(fila);
        }

        var html = barraInstruccion() +
            '<div class="mapa-bus">' +
            '<div class="frente-bus">' +
            '<span class="frente-volante">Volante</span>' +
            '<span class="butaca-personal">Docente</span>' +
            '<span class="butaca-personal">Asistencia</span>' +
            '</div><div class="malla-asientos">';

        filas.forEach(function (numeros, indiceFila) {
            html += '<div class="fila-asientos' + (indiceFila === 0 ? ' primera-fila' : '') + '">';

            [0, 1].forEach(function (posicion) {
                html += numeroButaca(numeros[posicion], porNumero);
            });

            html += '<span class="pasillo"></span>';

            [2, 3].forEach(function (posicion) {
                html += numeroButaca(numeros[posicion], porNumero);
            });

            html += '</div>';
        });

        html += '</div></div>' +
            '<div class="leyenda-mapa">' +
            '<span><i class="muestra libre"></i>Libre</span>' +
            '<span><i class="muestra ocupada"></i>Estudiante</span>' +
            '<span><i class="muestra tutor"></i>Acompañante</span>' +
            '</div>';

        return html;
    }

    function renderListadoAbordaje() {
        var mapa = estado.mapa;

        if (!mapa) {
            return '';
        }

        if (!mapa.ocupantes.length) {
            return '<div class="estado-vacio compacto"><strong>Sin listado generado</strong>' +
                '<p>Usa Generar listado para ordenar a los estudiantes según sus preferencias de compañía.</p></div>';
        }

        var filas = mapa.ocupantes.map(function (ocupante, indice) {
            var clases = 'abordaje-fila' + (ocupante.tipo === 'tutor' ? ' tutor' : '') +
                (estaSeleccionado(ocupante) ? ' seleccionada' : '');

            var detalle = ocupante.tipo === 'tutor'
                ? 'Acompañante de ' + ocupante.acompanado_de
                : (ocupante.encargado ? 'Encargado: ' + ocupante.encargado : 'Sin encargado');

            return '<li class="' + clases + '" draggable="true" data-accion="seleccionar-asiento"' +
                ' data-pasajero-id="' + ocupante.pasajero_id + '" data-rol="' + ocupante.tipo + '"' +
                ' data-asiento="' + ocupante.numero + '">' +
                '<span class="abordaje-numero">' + (indice + 1) + '</span>' +
                '<span class="abordaje-datos"><span class="abordaje-nombre">' + escapar(ocupante.nombre) + '</span>' +
                '<span class="abordaje-detalle">' + escapar(detalle) + '</span></span>' +
                '<span class="abordaje-asiento">Asiento ' + ocupante.numero + '</span>' +
                (ocupante.codigo ? '<span class="abordaje-codigo">' + escapar(ocupante.codigo) + '</span>' : '') +
                '</li>';
        }).join('');

        return '<div class="listado-aboarding">' +
            '<div class="listado-cabecera"><span>Orden de abordaje</span>' +
            '<span class="listado-total">' + mapa.ocupantes.length + ' personas</span></div>' +
            '<ol class="lista-abordaje">' + filas + '</ol></div>';
    }

    function seccionAsientos(viaje) {
        if (!viaje || !estado.mapa) {
            return '';
        }

        if (!estado.mapa.ocupantes.length) {
            return '<section class="tarjeta con-margen-inferior">' +
                '<div class="tarjeta-cabecera"><div><h2>Asignación de asientos</h2>' +
                '<p>El plano del autobús se habilita en cuanto se registren estudiantes en este viaje.</p></div></div>' +
                '<div class="tarjeta-cuerpo"><div class="estado-vacio compacto">' +
                '<strong>Este bus todavía no tiene estudiantes</strong>' +
                '<p>Agrega a los primeros estudiantes para poder distribuir las butacas y generar el listado de abordaje.</p>' +
                '<button type="button" class="boton boton-primario" data-accion="abrir-alta" data-id="' + viaje.id + '">' +
                icono(ICONOS.mas) + 'Agregar estudiante</button>' +
                '</div></div></section>';
        }

        return '<section class="tarjeta con-margen-inferior">' +
            '<div class="tarjeta-cabecera"><div><h2>Asignación de asientos</h2>' +
            '<p>Selecciona un estudiante y elige el asiento exacto que ocupará, o arrástralo hasta la butaca. Con <strong>Cerrar huecos</strong> el bus vuelve a quedar lleno de forma continua.</p></div>' +
            '<div class="acciones-vista">' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="deshacer-movimiento"' +
            (estado.historialAsientos.length ? '' : ' disabled') + ' title="Deshace el último cambio de asiento">' + icono(ICONOS.deshacer) + 'Deshacer</button>' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="compactar-asientos" title="Rellena los asientos vacíos intermedios">Cerrar huecos</button>' +
            '<button type="button" class="boton boton-secundario boton-pequeno" data-accion="generar-listado">Generar listado</button>' +
            '<a class="boton boton-borde boton-pequeno" href="listado.php?viaje=' + viaje.id + '" target="_blank" rel="noopener">Exportar PDF</a>' +
            '</div></div>' +
            '<div class="tarjeta-cuerpo"><div class="rejilla-asientos">' +
            '<div>' + renderMapaAsientos() + '</div>' +
            renderListadoAbordaje() +
            '</div></div></section>';
    }

    function cierreViaje(viaje) {
        if (viaje.estado === 'finalizado') {
            return '<div class="viaje-destacado-cierre">' +
                '<button type="button" class="boton boton-primario" data-accion="generar-listado-salida" data-id="' + viaje.id + '">' +
                icono(ICONOS.lista) + 'Ver listado de estudiantes</button>' +
                '<span class="nota-pequena texto-apagado">Viaje finalizado · el listado queda disponible con todos los buses y pasajeros.</span>' +
                '</div>';
        }

        if (!viaje.boletos_cerrados) {
            return '<div class="viaje-destacado-cierre">' +
                '<button type="button" class="boton boton-borde" data-accion="cerrar-boletos" data-id="' + viaje.id + '">' +
                icono(ICONOS.cheque) + 'Cerrar boletos</button>' +
                '<span class="nota-pequena texto-apagado">Al presionar este botón, ya no podrán ingresar más alumnos, ' +
                'a su vez, se podrá ver el listado de estudiantes.</span>' +
                '</div>';
        }

        return '<div class="viaje-destacado-cierre">' +
            '<button type="button" class="boton boton-primario" data-accion="generar-listado-salida" data-id="' + viaje.id + '">' +
            icono(ICONOS.lista) + 'Ver listado de estudiantes</button>' +
            '<button type="button" class="boton boton-borde" data-accion="cambiar-estado" data-estado="finalizado" data-id="' + viaje.id + '">' +
            icono(ICONOS.cheque) + 'Finalizar viaje ahora</button>' +
            '<span class="nota-pequena texto-apagado">Boletos cerrados. El viaje se finalizará automáticamente a las ' +
            escapar(viaje.hora_retorno || '23:59') + '; si termina antes de lo previsto, puedes finalizarlo ahora.</span>' +
            '</div>';
    }

    function vistaInicio() {
        var viaje = estado.viajeDetalle;
        var historial = estado.historial;

        var bloque;

        if (!viaje) {
            bloque = '<section class="tarjeta"><div class="estado-vacio">' +
                '<strong>No hay viajes registrados</strong>' +
                '<p>Todavía no existe ningún viaje en el sistema. Crea un paseo en Administración y programa el primer viaje.</p>' +
                '<button type="button" class="boton boton-primario" data-accion="ir-administracion">Ir a Administración</button>' +
                '</div></section>';
        } else {
            var porcentaje = viaje.capacidad_bus > 0 ? Math.round((viaje.ocupados / viaje.capacidad_bus) * 100) : 0;
            var claseBarra = porcentaje >= 100 ? 'error' : (porcentaje >= 85 ? 'atencion' : '');

            bloque = '<section class="viaje-destacado">' +
                '<div class="viaje-destacado-cabecera">' +
                '<div>' +
                '<div class="viaje-destacado-etiquetas">' +
                '<span class="metrica-etiqueta">Viaje actual</span>' + estadoPastilla(viaje.estado) +
                (viaje.boletos_cerrados && viaje.estado !== 'finalizado'
                    ? '<span class="pastilla atencion">Boletos cerrados</span>'
                    : '') + '</div>' +
                '<h2>' + escapar(viaje.nombre) + '</h2>' +
                '<p class="destino">' + escapar(viaje.destino) + '</p>' +
                '</div>' +
                '<div class="viaje-destacado-acciones">' +
                '<button type="button" class="boton boton-primario" data-accion="gestionar-viaje" data-id="' + viaje.id + '">Gestionar viaje</button>' +
                (viaje.boletos_cerrados
                    ? ''
                    : '<button type="button" class="boton boton-borde" data-accion="generar-listado-salida" data-id="' + viaje.id + '">' + icono(ICONOS.lista) + 'Ver listado</button>') +
                '<button type="button" class="boton boton-borde" data-accion="abrir-redistribucion" data-id="' + viaje.id + '">Redistribuir</button>' +
                '<button type="button" class="boton boton-borde" data-accion="ver-viaje" data-id="' + viaje.id + '">Ver detalle</button>' +
                '</div>' +
                '</div>' +
                '<div class="viaje-datos">' +
                '<div><p class="dato-etiqueta">Fecha</p><p class="dato-valor">' + escapar(fechaCorta(viaje.fecha)) + '<small>' + escapar(fechaLarga(viaje.fecha)) + '</small></p></div>' +
                '<div><p class="dato-etiqueta">Salida</p><p class="dato-valor numero">' + escapar(viaje.hora_salida) + '<small>Hora de salida</small></p></div>' +
                '<div><p class="dato-etiqueta">Retorno estimado</p><p class="dato-valor numero">' + escapar(viaje.hora_retorno || 'Por definir') + '<small>Hora de regreso</small></p></div>' +
                '<div><p class="dato-etiqueta">Autobús</p><p class="dato-valor numero">' + viaje.capacidad_bus + ' asientos<small>' + viaje.asientos_personal + ' reservados al personal</small></p></div>' +
                '</div>' +
                '<div class="ocupacion">' +
                '<div class="ocupacion-cabecera"><span>Ocupación del autobús</span><strong class="numero">' + viaje.ocupados + ' de ' + viaje.capacidad_bus + '</strong></div>' +
                '<div class="barra"><span class="barra-relleno ' + claseBarra + '" style="width:' + Math.min(100, porcentaje) + '%"></span></div>' +
                '<div class="ocupacion-cabecera"><span>' + viaje.pasajeros + ' estudiantes · ' + viaje.acompanantes + ' acompañantes · ' + viaje.asientos_personal + ' de personal</span><span class="numero">' + porcentaje + '%</span></div>' +
                '</div>' +
                cierreViaje(viaje) +
                '</section>';
        }

        var pasajeros = viaje ? viaje.pasajeros_lista : [];
        var filtrados = pasajeros.filter(function (pasajero) {
            if (!estado.busquedaPasajeros) {
                return true;
            }
            var texto = (pasajero.nombre + ' ' + pasajero.codigo + ' ' + (pasajero.encargado || '')).toLowerCase();
            return texto.indexOf(estado.busquedaPasajeros.toLowerCase()) !== -1;
        });

        var filasPasajeros = filtrados.length ? filtrados.map(function (pasajero) {
            return '<tr>' +
                '<td><span class="orden-inscripcion">' + pasajero.orden + '</span></td>' +
                '<td><span class="celda-principal">' + escapar(pasajero.nombre) + '</span>' +
                (pasajero.encargado ? '<span class="celda-secundaria">Encargado: ' + escapar(pasajero.encargado) + '</span>' : '') +
                (pasajero.duplicado ? '<span class="pastilla error sin-punto linea">Código repetido</span>' : '') +
                (pasajero.companeros && pasajero.companeros.length ? '<span class="celda-secundaria">Se sienta con ' + escapar(pasajero.companeros.join(', ')) + '</span>' : '') + '</td>' +
                '<td class="numero celda-codigo">' + escapar(pasajero.codigo) + '</td>' +
                '<td>' + (pasajero.encargado ? escapar(pasajero.encargado) : '<span class="sin-dato">Sin encargado</span>') + '</td>' +
                '<td class="columna-media numero">' + dinero(pasajero.costo) +
                (pasajero.encargado ? '<span class="celda-secundaria">incluye encargado</span>' : '') + '</td>' +
                '<td class="columna-media numero">' + dinero(pasajero.pagado) + '</td>' +
                '<td class="columna-acciones">' +
                '<button type="button" class="boton-icono" data-accion="cobrar-pasajero" data-id="' + pasajero.id + '" title="Registrar pago de ' + escapar(pasajero.nombre) + '">' + icono(ICONOS.cobrar) + '</button>' +
                '<button type="button" class="boton-icono peligro" data-accion="quitar-pasajero" data-id="' + pasajero.id + '" data-viaje="' + viaje.id + '" title="Retirar del viaje">' + icono(ICONOS.bote) + '</button></td>' +
                '</tr>';
        }).join('') : (viaje
            ? '<tr><td colspan="7"><div class="estado-vacio"><strong>Sin estudiantes</strong><p>Agrega a los primeros estudiantes desde el botón Gestionar viaje.</p></div></td></tr>'
            : '<tr><td colspan="7"><div class="estado-vacio"><strong>Sin viaje activo</strong><p>Crea un paseo en Administración y programa un viaje para inscribir estudiantes.</p></div></td></tr>');

        var filasHistorial = historial.length ? historial.map(function (item) {
            return '<tr>' +
                '<td><span class="celda-principal">' + escapar(fechaCorta(item.fecha)) + '</span><span class="celda-secundaria">' + escapar(fechaLarga(item.fecha)) + '</span></td>' +
                '<td>' + escapar(item.nombre) + '<span class="celda-secundaria">' + escapar(item.destino) +
                (item.bus_total > 1 ? ' · Bus ' + item.bus_numero + ' de ' + item.bus_total : '') + '</span></td>' +
                '<td class="columna-media numero">' + item.pasajeros + '</td>' +
                '<td class="columna-media numero">' + dinero(item.recaudado) +
                (item.pendiente > 0 ? '<span class="celda-secundaria">faltan ' + dinero(item.pendiente) + '</span>' : '') + '</td>' +
                '<td>' + estadoPastilla(item.estado) + '</td>' +
                '<td class="columna-acciones"><button type="button" class="boton boton-borde boton-pequeno" data-accion="ver-viaje" data-id="' + item.id + '">Ver detalle</button></td>' +
                '</tr>';
        }).join('') : '<tr><td colspan="6"><div class="estado-vacio"><strong>Todavía no hay historial</strong><p>Los viajes finalizados quedan registrados aquí.</p></div></td></tr>';

        var panelLateral = '';

        if (viaje) {
            panelLateral = '<div class="columna">' +
                '<section class="tarjeta"><div class="tarjeta-cabecera"><h3>Datos del paseo</h3></div>' +
                '<div class="tarjeta-cuerpo compacto"><dl class="lista-datos">' +
                '<div><dt>Nombre</dt><dd>' + escapar(viaje.nombre) + '</dd></div>' +
                '<div><dt>Destino</dt><dd>' + escapar(viaje.destino) + '</dd></div>' +
                '<div><dt>Costo por persona</dt><dd class="numero">' + dinero(viaje.costo_persona) + '</dd></div>' +
                '<div><dt>Estudiantes</dt><dd class="numero">' + viaje.pasajeros + '</dd></div>' +
                '<div><dt>Acompañantes</dt><dd class="numero">' + viaje.acompanantes + '</dd></div>' +
                '<div><dt>Costo total esperado</dt><dd class="numero">' + dinero(viaje.esperado) + '</dd></div>' +
                '<div><dt>Recaudado</dt><dd class="numero">' + dinero(viaje.recaudado) + '</dd></div>' +
                '<div><dt>Por cobrar</dt><dd class="numero">' + dinero(viaje.pendiente) + '</dd></div>' +
                '<div><dt>Profesor a cargo</dt><dd>' + escapar(viaje.profesor_encargado) + '</dd></div>' +
                '<div><dt>Salida</dt><dd class="numero">' + escapar(viaje.hora_salida) + '</dd></div>' +
                '<div><dt>Retorno estimado</dt><dd class="numero">' + escapar(viaje.hora_retorno || 'Por definir') + '</dd></div>' +
                '</dl></div></section>' +
                '<section class="tarjeta"><div class="tarjeta-cabecera"><h3>Personal del viaje</h3></div>' +
                '<div class="tarjeta-cuerpo compacto"><ul class="pila-personas">' +
                '<li><span class="inicial-persona">' + iniciales(viaje.profesor_encargado) + '</span><span class="persona-datos"><span class="persona-nombre">' + escapar(viaje.profesor_encargado) + '</span><span class="persona-puesto">Profesor encargado</span></span></li>' +
                (viaje.equipo_asistencia.length ? viaje.equipo_asistencia.map(function (persona) {
                    return '<li><span class="inicial-persona">' + iniciales(persona.nombre) + '</span><span class="persona-datos"><span class="persona-nombre">' + escapar(persona.nombre) + '</span><span class="persona-puesto">' + escapar(persona.puesto || 'Asistencia') + '</span></span></li>';
                }).join('') : '<li><span class="celda-secundaria sin-margen">Sin personal de asistencia asignados</span></li>') +
                '</ul></div></section>' +
                '</div>';
        }

        var programados = estado.programados.filter(function (item) {
            return !viaje || item.id !== viaje.id;
        });

        var buses = (viaje && viaje.buses) ? viaje.buses : [];

        var seccionBuses = buses.length ? '<section class="tarjeta con-margen-inferior">' +
            '<div class="tarjeta-cabecera"><div><h2>Buses de esta salida</h2><p>' + buses.length +
            ' bus(es) cubriendo ' + escapar(viaje.nombre) + ' el ' + escapar(fechaCorta(viaje.fecha)) + '</p></div>' +
            '<div class="acciones-vista"><button type="button" class="boton boton-borde boton-pequeno" data-accion="abrir-redistribucion" data-id="' + viaje.id + '">Redistribuir pasajeros</button></div></div>' +
            '<div class="tarjeta-cuerpo lista-tarjetas">' +
            buses.map(function (bus) {
                var porcentaje = bus.capacidad_bus > 0 ? Math.round((bus.ocupados / bus.capacidad_bus) * 100) : 0;
                var claseBarra = porcentaje >= 100 ? 'error' : (porcentaje >= 85 ? 'atencion' : '');

                return '<article class="tarjeta-viaje">' +
                    '<p class="ruta">Bus ' + bus.numero + '</p>' +
                    '<p class="celda-secundaria sin-margen">' + escapar(bus.hora_salida) + ' — ' + escapar(bus.hora_retorno || 'Por definir') + '</p>' +
                    '<div class="barra"><span class="barra-relleno ' + claseBarra + '" style="width:' + Math.min(100, porcentaje) + '%"></span></div>' +
                    '<div class="meta">' +
                    '<span>' + icono(ICONOS.usuarios) + bus.ocupados + ' / ' + bus.capacidad_bus + ' ocupados</span>' +
                    '<span>' + icono(ICONOS.asientos) + bus.cupos_disponibles + ' cupos libres</span>' +
                    '</div>' +
                    '</article>';
            }).join('') +
            '</div></section>' : '';

        return '<div class="vista">' +
            '<div class="encabezado-vista">' +
            '<div><h1>Inicio</h1><p>Viaje actual, control de pasajeros y respaldo de los viajes anteriores.</p></div>' +
            '<div class="acciones-vista">' +
            '<button type="button" class="boton boton-borde" data-accion="recargar">' + icono(ICONOS.refrescar) + 'Actualizar</button>' +
            '<button type="button" class="boton boton-secundario" data-accion="ir-administracion">Programar viaje</button>' +
            '</div></div>' +
            bloque +
            (viaje ? '<div class="metricas">' + metricasViaje(viaje) + '</div>' : '') +
            seccionBuses +
            '<div class="rejilla-doble con-margen-inferior">' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><div><h2>Lista de pasajeros</h2><p>Se muestran en el orden en que fueron inscritos</p></div>' +
            '<div class="tarjeta-filtros"><div class="buscador">' + icono(ICONOS.lupa) +
            '<input type="search" class="control" id="busqueda-pasajeros" placeholder="Buscar por nombre, código o encargado" value="' + escapar(estado.busquedaPasajeros) + '"></div>' +
            (viaje ? '<button type="button" class="boton boton-borde boton-pequeno" data-accion="cobrar-todos" title="Registra el pago de todos los que aun deben"' +
            (viaje.pendiente > 0 ? '' : ' disabled') + '>' + icono(ICONOS.cobrar) + 'Cobrar pendientes</button>' +
            '<button type="button" class="boton boton-primario boton-pequeno" data-accion="abrir-alta" data-id="' + viaje.id + '">' +
            icono(ICONOS.mas) + 'Agregar estudiante</button>' : '') + '</div></div>' +
            '<div class="tabla-envoltura tabla-alta"><table class="tabla"><thead><tr>' +
            '<th class="col-orden">Orden</th><th>Estudiante</th><th>Código</th><th>Encargado</th><th class="col-derecha">Costo</th><th class="col-derecha">Pagado</th><th></th>' +
            '</tr></thead><tbody>' + filasPasajeros + '</tbody></table></div>' +
            '</section>' +
            panelLateral +
            '</div>' +
            seccionAsientos(viaje) +
            '<section class="tarjeta con-margen-inferior">' +
            '<div class="tarjeta-cabecera"><div><h2>Historial de viajes</h2><p>Viajes que ya se realizaron o cuya fecha pasó</p></div></div>' +
            '<div class="tabla-envoltura"><table class="tabla"><thead><tr>' +
            '<th>Fecha</th><th>Paseo</th><th class="col-derecha">Pasajeros</th><th class="col-derecha">Recaudado</th><th>Estado</th><th></th>' +
            '</tr></thead><tbody>' + filasHistorial + '</tbody></table></div>' +
            '</section>' +
            (programados.length ? '<section class="tarjeta">' +
                '<div class="tarjeta-cabecera"><div><h2>Próximos viajes</h2><p>Viajes programados con fecha posterior a hoy</p></div></div>' +
                '<div class="tarjeta-cuerpo lista-tarjetas">' +
                programados.map(function (item) {
                    return '<article class="tarjeta-viaje">' +
                        '<p class="ruta">' + escapar(item.nombre) + '</p>' +
                        '<p class="celda-secundaria sin-margen">' + escapar(item.destino) +
                        (item.bus_total > 1 ? ' · Bus ' + item.bus_numero + ' de ' + item.bus_total : '') + '</p>' +
                        '<div class="meta">' +
                        '<span>' + icono(ICONOS.calendario) + escapar(fechaCorta(item.fecha)) + '</span>' +
                        '<span>' + icono(ICONOS.reloj) + escapar(item.hora_salida) + '</span>' +
                        '<span>' + icono(ICONOS.usuarios) + item.pasajeros + ' pasajeros</span>' +
                        '<span>' + icono(ICONOS.dinero) + dinero(item.recaudado) + '</span>' +
                        '</div>' +
                        '<div class="acciones"><button type="button" class="boton boton-borde boton-pequeno" data-accion="gestionar-viaje" data-id="' + item.id + '">Gestionar</button>' +
                        '<button type="button" class="boton boton-borde boton-pequeno" data-accion="ver-viaje" data-id="' + item.id + '">Detalle</button></div>' +
                        '</article>';
                }).join('') +
                '</div></section>' : '') +
            '</div>';
    }

    function fechaMedia(iso) {
        if (!iso) {
            return '—';
        }

        var fecha = new Date(iso + 'T00:00:00');

        if (isNaN(fecha.getTime())) {
            return fechaCorta(iso);
        }

        return fecha.toLocaleDateString(localeFechas(), { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function porcentaje(valor) {
        var numero = Number(valor || 0);
        var texto = numero.toFixed(1);

        return (texto.slice(-2) === '.0' ? texto.slice(0, -2) : texto) + '%';
    }

    function numeroCorto(valor) {
        return Number(valor || 0).toLocaleString('es-SV', { maximumFractionDigits: 1 });
    }

    function selectorPeriodo() {
        var periodos = [
            { id: 'mensual', texto: 'Mensual' },
            { id: 'trimestral', texto: 'Trimestral' },
            { id: 'anual', texto: 'Anual' }
        ];

        return '<div class="segmentado" role="group" aria-label="Período de las estadísticas">' +
            periodos.map(function (periodo) {
                var activo = estado.periodo === periodo.id;

                return '<button type="button" class="segmento' + (activo ? ' activa' : '') + '"' +
                    ' data-accion="cambiar-periodo" data-periodo="' + periodo.id + '"' +
                    ' aria-pressed="' + (activo ? 'true' : 'false') + '">' + periodo.texto + '</button>';
            }).join('') +
            '</div>';
    }

    function pastillaSalida(estadoSalida) {
        if (estadoSalida === 'en_curso') {
            return '<span class="pastilla exito">En curso</span>';
        }

        if (estadoSalida === 'sin_cerrar') {
            return '<span class="pastilla atencion">Sin finalizar</span>';
        }

        return '<span class="pastilla neutra sin-punto">Finalizada</span>';
    }

    function vistaEstadisticas() {
        var datos = estado.estadisticas;

        var encabezado = '<div class="encabezado-vista">' +
            '<div><h1>Estadísticas</h1><p>Ocupación de los autobuses y métricas globales de las salidas realizadas.</p></div>' +
            '<div class="acciones-vista">' + selectorPeriodo() +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="recargar-estadisticas">' +
            icono(ICONOS.refrescar) + 'Actualizar</button>' +
            '</div></div>';

        if (!datos) {
            return '<div class="vista">' + encabezado +
                '<div class="cargando"><span class="cargando-barra"></span><p>Calculando las estadísticas del período</p></div></div>';
        }

        if (datos.error) {
            return '<div class="vista">' + encabezado +
                '<section class="tarjeta"><div class="estado-vacio">' +
                '<strong>No se pudieron calcular las estadísticas</strong>' +
                '<p>' + escapar(datos.error) + '</p>' +
                '<button type="button" class="boton boton-primario" data-accion="recargar-estadisticas">Reintentar</button>' +
                '</div></section></div>';
        }

        var resumen = datos.resumen;

        var metricas = tarjetasMetricas([
            {
                etiqueta: 'Salidas realizadas',
                valor: String(resumen.salidas),
                detalle: resumen.buses === 1 ? '1 autobús utilizado' : resumen.buses + ' autobuses utilizados',
                icono: ICONOS.calendario
            },
            {
                etiqueta: 'Estudiantes beneficiados',
                valor: String(resumen.beneficiados),
                detalle: resumen.poblacion > 0
                    ? 'de ' + resumen.poblacion + ' códigos registrados'
                    : 'sin códigos registrados',
                icono: ICONOS.usuarios,
                clase: 'verde'
            },
            {
                etiqueta: 'Promedio de asistencia',
                valor: porcentaje(resumen.asistencia),
                detalle: numeroCorto(resumen.promedio_estudiantes) + ' estudiantes por salida',
                icono: ICONOS.grafico
            },
            {
                etiqueta: 'Ocupación promedio',
                valor: porcentaje(resumen.ocupacion),
                detalle: resumen.capacidad > 0
                    ? resumen.ocupados + ' de ' + resumen.capacidad + ' asientos utilizados'
                    : 'sin autobuses en el período',
                icono: ICONOS.asientos,
                clase: 'ambar'
            }
        ]);

        var grupos = datos.salidas.length ? datos.salidas.map(function (salida) {
            var barras = salida.buses.map(function (bus) {
                var clase = bus.ocupacion >= 100 ? 'error' : (bus.ocupacion >= 85 ? 'atencion' : '');
                var libres = Math.max(0, bus.capacidad - bus.ocupados);

                return '<div class="fila-ocupacion">' +
                    '<div class="fila-ocupacion-cabecera">' +
                    '<span><strong>Autobús ' + bus.numero + '</strong>' +
                    '<span class="texto-apagado"> · ' + bus.pasajeros + (bus.pasajeros === 1 ? ' estudiante' : ' estudiantes') +
                    (bus.acompanantes > 0 ? ' · ' + bus.acompanantes + (bus.acompanantes === 1 ? ' acompañante' : ' acompañantes') : '') +
                    '</span></span>' +
                    '<span class="fila-ocupacion-valor numero">' + bus.ocupacion + '%</span>' +
                    '</div>' +
                    '<div class="barra"><span class="barra-relleno ' + clase + '" style="width:' + Math.min(100, bus.ocupacion) + '%"></span></div>' +
                    '<div class="fila-ocupacion-pie"><span>' + bus.ocupados + ' de ' + bus.capacidad + ' asientos</span><span>' +
                    (libres === 0 ? 'Sin cupos libres' : libres + ' libres') + '</span></div>' +
                    '</div>';
            }).join('');

            return '<article class="grupo-salida">' +
                '<header class="grupo-salida-cabecera">' +
                '<div><h3>' + escapar(salida.nombre) + '</h3>' +
                '<p class="texto-apagado">' + escapar(fechaLarga(salida.fecha)) + ' · ' + escapar(salida.hora_salida) + '</p></div>' +
                '<div class="grupo-salida-lado">' + pastillaSalida(salida.estado) +
                '<span class="grupo-salida-ocupacion"><strong class="numero">' + salida.ocupacion + '%</strong><small>ocupación</small></span>' +
                '</div></header>' +
                '<div class="lista-ocupacion">' + barras + '</div>' +
                '<footer class="grupo-salida-pie">' +
                '<span>' + salida.estudiantes + (salida.estudiantes === 1 ? ' estudiante' : ' estudiantes') + '</span>' +
                '<span>' + salida.personas + (salida.personas === 1 ? ' persona' : ' personas') + ' entre estudiantes y acompañantes</span>' +
                '</footer></article>';
        }).join('') : '<div class="estado-vacio"><strong>Sin salidas realizadas en el período</strong>' +
            '<p>Cambia el período o programa una salida para empezar a medir la ocupación de los autobuses.</p></div>';

        var filasResumen = [
            ['Salidas realizadas', String(resumen.salidas)],
            ['Autobuses utilizados', String(resumen.buses)],
            ['Estudiantes beneficiados', String(resumen.beneficiados)],
            ['Participaciones', String(resumen.participaciones)],
            ['Códigos en el padrón', String(resumen.poblacion)],
            ['Promedio por salida', numeroCorto(resumen.promedio_estudiantes) + ' estudiantes']
        ].map(function (fila) {
            return '<div><dt>' + fila[0] + '</dt><dd class="numero">' + fila[1] + '</dd></div>';
        }).join('');

        var resumenCard = '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><div><h2>Resumen general</h2><p>Volumen de la operación en el período</p></div></div>' +
            '<div class="tarjeta-cuerpo compacto">' +
            '<dl class="lista-datos">' + filasResumen + '</dl>' +
            '<div class="asistencia-bloque">' +
            '<div class="asistencia-cabecera"><span>Participación estudiantil</span>' +
            '<strong class="numero">' + porcentaje(resumen.asistencia) + '</strong></div>' +
            '<div class="barra"><span class="barra-relleno" style="width:' + Math.min(100, resumen.asistencia) + '%"></span></div>' +
            '<p class="nota-pequena texto-apagado">En promedio viajan ' + numeroCorto(resumen.promedio_estudiantes) +
            ' de los ' + resumen.poblacion + ' estudiantes registrados en cada salida.</p>' +
            '</div>' +
            '<p class="nota-pequena texto-apagado">Los estudiantes se cuentan por su código: quien viaja en varias salidas ' +
            'suma una sola persona beneficiada, pero una participación por salida.</p>' +
            '</div></section>';

        return '<div class="vista">' + encabezado +
            '<p class="rango-periodo">' + escapar(fechaMedia(datos.rango.desde) + ' – ' + fechaMedia(datos.rango.hasta)) +
            ' · ' + datos.salidas.length + (datos.salidas.length === 1 ? ' salida' : ' salidas') + '</p>' +
            '<div class="metricas">' + metricas + '</div>' +
            '<div class="rejilla-estadisticas">' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><div><h2>Ocupación por autobús</h2>' +
            '<p>Capacidad utilizada en cada salida del período</p></div></div>' +
            '<div class="tarjeta-cuerpo compacto">' + grupos + '</div>' +
            '</section>' +
            resumenCard +
            '</div></div>';
    }

    function vistaAdministracion() {
        var parametros = estado.parametros;

        var filasPaseos = estado.paseos.length ? estado.paseos.map(function (paseo) {
            var nombres = paseo.equipo_asistencia.map(function (persona) { return persona.nombre; });
            var filtro = estado.filtroPaseos.toLowerCase();

            if (filtro && (paseo.nombre + paseo.destino + paseo.profesor_encargado).toLowerCase().indexOf(filtro) === -1) {
                return '';
            }

            return '<tr>' +
                '<td><span class="celda-principal">' + escapar(paseo.nombre) + '</span><span class="celda-secundaria">' + escapar(paseo.destino) + '</span></td>' +
                '<td class="columna-media numero">' + dinero(paseo.costo_persona) + '</td>' +
                '<td>' + escapar(paseo.profesor_encargado) + '</td>' +
                '<td>' + (nombres.length ? nombres.slice(0, 1).map(function (nombre) {
                    return '<span class="pastilla neutra sin-punto pastilla-fila">' + escapar(nombre) + '</span>';
                }).join('') + (nombres.length > 1 ? '<span class="pastilla neutra sin-punto pastilla-fila">+' + (nombres.length - 1) + '</span>' : '') : '<span class="sin-dato">Sin asignar</span>') + '</td>' +
                '<td class="columna-acciones">' +
                '<button type="button" class="boton boton-borde boton-pequeno" data-accion="programar-viaje" data-id="' + paseo.id + '">Programar viaje</button> ' +
                '<button type="button" class="boton-icono" data-accion="editar-paseo" data-id="' + paseo.id + '" title="Editar paseo">' + icono(ICONOS.lapiz) + '</button> ' +
                '<button type="button" class="boton-icono peligro" data-accion="eliminar-paseo" data-id="' + paseo.id + '" title="Eliminar paseo">' + icono(ICONOS.bote) + '</button>' +
                '</td></tr>';
        }).join('') : '<tr><td colspan="5"><div class="estado-vacio"><strong>Sin paseos</strong><p>Crea el primer paseo para poder programar viajes.</p></div></td></tr>';

        var viajesProgramados = estado.programados.map(function (item) {
            return '<tr>' +
                '<td><span class="celda-principal">' + escapar(fechaCorta(item.fecha)) + '</span><span class="celda-secundaria">' + escapar(item.nombre) +
                (item.bus_total > 1 ? ' · Bus ' + item.bus_numero + ' de ' + item.bus_total : '') + '</span></td>' +
                '<td class="numero">' + escapar(item.hora_salida) + ' — ' + escapar(item.hora_retorno || '—') + '</td>' +
                '<td class="columna-media numero">' + item.pasajeros + ' / ' + (item.capacidad_bus - item.asientos_personal) + '</td>' +
                '<td>' + estadoPastilla(item.estado) + '</td>' +
                '<td class="columna-acciones">' +
                '<button type="button" class="boton boton-borde boton-pequeno" data-accion="gestionar-viaje" data-id="' + item.id + '">Gestionar</button> ' +
                '<button type="button" class="boton-icono peligro" data-accion="eliminar-viaje" data-id="' + item.id + '" title="Eliminar viaje">' + icono(ICONOS.bote) + '</button>' +
                '</td></tr>';
        }).join('');

        var personalItems = estado.personal.map(function (persona) {
            return '<li><span class="inicial-persona">' + iniciales(persona.nombre) + '</span>' +
                '<span class="persona-datos"><span class="persona-nombre">' + escapar(persona.nombre) + '</span>' +
                '<span class="persona-puesto">' + escapar(persona.puesto || 'Asistencia') + '</span></span>' +
                '<button type="button" class="boton-icono peligro" data-accion="eliminar-personal" data-id="' + persona.id + '" title="Eliminar">' + icono(ICONOS.bote) + '</button></li>';
        }).join('');

        return '<div class="vista">' +
            '<div class="encabezado-vista">' +
            '<div><h1>Administración</h1><p>Configuración de paseos, personal a bordo y parámetros generales del sistema.</p></div>' +
            '<div class="acciones-vista">' +
            '<button type="button" class="boton boton-borde" data-accion="recargar">' + icono(ICONOS.refrescar) + 'Actualizar</button>' +
            '<button type="button" class="boton boton-secundario" data-accion="programar-viaje">Programar viaje</button>' +
            '<button type="button" class="boton boton-primario" data-accion="nuevo-paseo">' + icono(ICONOS.mas) + 'Nuevo paseo</button>' +
            '</div></div>' +
            '<div class="rejilla-lateral">' +
            '<div class="columna">' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><div><h2>Paseos</h2><p>Catálogo de destinos disponibles para la colecturía</p></div>' +
            '<div class="tarjeta-filtros"><div class="buscador">' + icono(ICONOS.lupa) +
            '<input type="search" class="control" id="busqueda-paseos" placeholder="Buscar paseo" value="' + escapar(estado.filtroPaseos) + '"></div></div></div>' +
            '<div class="tabla-envoltura"><table class="tabla tabla-compacta"><thead><tr>' +
            '<th>Paseo</th><th class="col-derecha">Costo</th><th>Profesor a cargo</th><th>Asistencia</th><th></th>' +
            '</tr></thead><tbody>' + filasPaseos + '</tbody></table></div>' +
            '</section>' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><div><h2>Viajes programados</h2><p>Los viajes se muestran en la pestaña Inicio</p></div></div>' +
            (viajesProgramados ? '<div class="tabla-envoltura"><table class="tabla"><thead><tr>' +
                '<th>Viaje</th><th>Horario</th><th class="col-derecha">Ocupación</th><th>Estado</th><th></th>' +
                '</tr></thead><tbody>' + viajesProgramados + '</tbody></table></div>'
                : '<div class="estado-vacio"><strong>Sin viajes programados</strong><p>Programa un viaje desde un paseo para que aparezca en Inicio.</p></div>') +
            '</section>' +
            '</div>' +
            '<div class="columna">' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><h3>Parámetros globales</h3></div>' +
            '<div class="tarjeta-cuerpo compacto"><div class="tarjeta-parametros">' +
            '<div class="parametro-fila"><div><p class="celda-principal">Capacidad del autobús</p><p class="descripcion">Asientos totales, incluyendo al profesor y al personal de asistencia.</p></div>' +
            '<div class="parametro-valor"><input type="number" class="control numero" id="parametro-capacidad" min="1" value="' + parametros.capacidad_bus + '">' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="guardar-capacidad">Guardar</button></div></div>' +
            '<div class="parametro-fila"><div><p class="celda-principal">Asientos de personal</p><p class="descripcion">Se descuentan de la capacidad para los estudiantes.</p></div>' +
            '<div class="parametro-valor"><input type="number" class="control numero" id="parametro-personal" min="1" value="' + parametros.asientos_personal + '">' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="guardar-personal">Guardar</button></div></div>' +
            '<div class="parametro-fila"><div><p class="celda-principal">Orden de los pasajeros</p><p class="descripcion">Las listas se muestran según se va agregando cada estudiante.</p></div>' +
            '<div class="parametro-valor"><span class="parametro-fijo">Orden de inscripción</span></div></div>' +
            '</div></div></section>' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><h3>Personal de Asistencia</h3></div>' +
            '<div class="tarjeta-cuerpo compacto">' +
            (estado.personal.length ? '<ul class="pila-personas">' + personalItems + '</ul>' : '<p class="texto-apagado nota-pequena">Aún no hay personal registrado.</p>') +
            '<div class="nuevos-nombres separado">' +
            '<input type="text" class="control" id="nuevo-personal" placeholder="Nombre del nuevo personal">' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="agregar-personal">Agregar</button>' +
            '</div></div></section>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    /**
     * Alumnos que pasan los filtros de la vista: búsqueda, año y sección.
     *
     * El padrón llega completo desde el API y aquí se filtra en el navegador,
     * así los cambios de filtro son inmediatos.
     */
    function alumnosFiltrados() {
        var filtro = estado.filtroAlumnos;
        var termino = (filtro.q || '').trim().toLowerCase();

        return (estado.alumnos || []).filter(function (alumno) {
            if (filtro.anio && String(alumno.anio || '') !== filtro.anio) {
                return false;
            }

            if (filtro.seccion_id && String(alumno.seccion_id || '') !== filtro.seccion_id) {
                return false;
            }

            if (termino) {
                var texto = [
                    alumno.nombre, alumno.codigo, alumno.seccion, alumno.encargado,
                    alumno.telefono, alumno.telefono_encargado
                ].join(' ').toLowerCase();

                if (texto.indexOf(termino) === -1) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Los alumnos ya vienen ordenados por sección desde el servidor, así que
     * basta con cortar en cada cambio de sección para agruparlos.
     *
     * @return {Array<{nombre: string, alumnos: Array}>}
     */
    function gruposDeAlumnos() {
        var grupos = [];
        var porSeccion = {};

        alumnosFiltrados().forEach(function (alumno) {
            var clave = alumno.seccion_id || 0;

            if (!porSeccion[clave]) {
                porSeccion[clave] = { nombre: alumno.seccion || '', alumnos: [] };
                grupos.push(porSeccion[clave]);
            }

            porSeccion[clave].alumnos.push(alumno);
        });

        return grupos;
    }

    function filaAlumno(alumno) {
        return '<tr>' +
            '<td><span class="celda-principal">' + escapar(alumno.nombre) + '</span>' +
            '<span class="celda-secundaria numero">' + escapar(alumno.codigo) + '</span></td>' +
            '<td>' + (alumno.telefono ? escapar(alumno.telefono) : '<span class="sin-dato">Sin teléfono</span>') + '</td>' +
            '<td>' + (alumno.encargado
                ? escapar(alumno.encargado) + '<span class="celda-secundaria">' +
                  (alumno.telefono_encargado ? escapar(alumno.telefono_encargado) : 'Sin teléfono') + '</span>'
                : '<span class="sin-dato">Sin encargado</span>') + '</td>' +
            '<td>' + (alumno.activo
                ? '<span class="pastilla primaria sin-punto">Activo</span>'
                : '<span class="pastilla neutra sin-punto">Inactivo</span>') + '</td>' +
            '<td class="columna-acciones">' +
            '<button type="button" class="boton-icono" data-accion="editar-alumno" data-id="' + alumno.id + '" title="Editar alumno">' + icono(ICONOS.lapiz) + '</button>' +
            '<button type="button" class="boton-icono peligro" data-accion="eliminar-alumno" data-id="' + alumno.id + '" title="Eliminar del padrón">' + icono(ICONOS.bote) + '</button>' +
            '</td></tr>';
    }

    function filaSeccion(seccion) {
        return '<tr>' +
            '<td><span class="celda-principal">' + escapar(seccion.nombre) + '</span>' +
            '<span class="celda-secundaria">' + (seccion.especialidad ? escapar(seccion.especialidad) : 'Sin especialidad') + '</span></td>' +
            '<td class="numero">' + seccion.anio + '°</td>' +
            '<td class="col-derecha numero">' + seccion.alumnos + '</td>' +
            '<td class="columna-acciones">' +
            '<button type="button" class="boton-icono" data-accion="editar-seccion" data-id="' + seccion.id + '" title="Editar sección">' + icono(ICONOS.lapiz) + '</button>' +
            '<button type="button" class="boton-icono peligro" data-accion="eliminar-seccion" data-id="' + seccion.id + '" title="Eliminar sección">' + icono(ICONOS.bote) + '</button>' +
            '</td></tr>';
    }

    function vistaAlumnos() {
        var encabezado = '<div class="encabezado-vista">' +
            '<div><h1>Alumnos</h1><p>Padrón del instituto ordenado por sección: código, encargado y teléfono de contacto.</p></div>' +
            '<div class="acciones-vista">' +
            '<button type="button" class="boton boton-borde" data-accion="recargar-alumnos">' + icono(ICONOS.refrescar) + 'Actualizar</button>' +
            '<button type="button" class="boton boton-secundario" data-accion="nueva-seccion">Nueva sección</button>' +
            '<button type="button" class="boton boton-primario" data-accion="nuevo-alumno">' + icono(ICONOS.mas) + 'Nuevo alumno</button>' +
            '</div></div>';

        if (estado.errorPadron) {
            return '<div class="vista">' + encabezado + '<section class="tarjeta"><div class="estado-vacio">' +
                '<strong>No se pudo cargar el padrón</strong>' +
                '<p>' + escapar(estado.errorPadron) + '</p>' +
                '<button type="button" class="boton boton-primario" data-accion="recargar-alumnos">Reintentar</button>' +
                '</div></section></div>';
        }

        if (!estado.alumnos) {
            return '<div class="vista">' + encabezado +
                '<div class="cargando"><span class="cargando-barra"></span><p>Cargando el padrón de alumnos</p></div></div>';
        }

        var resumen = estado.resumenPadron || { alumnos: 0, con_encargado: 0, activos: 0, secciones: 0 };
        var grupos = gruposDeAlumnos();

        var anios = [];

        estado.secciones.forEach(function (seccion) {
            if (anios.indexOf(seccion.anio) === -1) {
                anios.push(seccion.anio);
            }
        });

        anios.sort(function (a, b) { return a - b; });

        var opcionesAnio = '<option value="">Todos los años</option>' + anios.map(function (anio) {
            return '<option value="' + anio + '"' + (estado.filtroAlumnos.anio === String(anio) ? ' selected' : '') + '>' +
                anio + '° año</option>';
        }).join('');

        var opcionesSeccion = '<option value="">Todas las secciones</option>' + estado.secciones.map(function (seccion) {
            return '<option value="' + seccion.id + '"' +
                (estado.filtroAlumnos.seccion_id === String(seccion.id) ? ' selected' : '') + '>' +
                escapar(seccion.nombre) + '</option>';
        }).join('');

        var filas = grupos.length ? grupos.map(function (grupo) {
            return '<tr class="fila-grupo"><td colspan="5">' +
                '<span class="fila-grupo-nombre">' + escapar(grupo.nombre || 'Sin sección') + '</span>' +
                '<span class="fila-grupo-cuenta">' + grupo.alumnos.length +
                (grupo.alumnos.length === 1 ? ' alumno' : ' alumnos') + '</span>' +
                '</td></tr>' + grupo.alumnos.map(filaAlumno).join('');
        }).join('') : '<tr><td colspan="5"><div class="estado-vacio compacto">' +
            '<strong>Sin alumnos que coincidan</strong>' +
            '<p>Ajusta la búsqueda o los filtros de sección.</p></div></td></tr>';

        var filasSecciones = estado.secciones.length ? estado.secciones.map(filaSeccion).join('')
            : '<tr><td colspan="4"><div class="estado-vacio compacto">' +
              '<strong>Sin secciones</strong><p>Crea la primera sección para agrupar el padrón.</p></div></td></tr>';

        var metrica = function (etiqueta, valor, detalle) {
            return '<div class="parametro-fila"><div><p class="celda-principal">' + etiqueta + '</p>' +
                '<p class="descripcion">' + detalle + '</p></div>' +
                '<div class="parametro-valor"><span class="parametro-fijo numero">' + valor + '</span></div></div>';
        };

        return '<div class="vista">' + encabezado +
            '<div class="rejilla-lateral">' +
            '<div class="columna">' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><div><h2>Padrón</h2>' +
            '<p>' + estado.totalAlumnos + (estado.totalAlumnos === 1 ? ' alumno' : ' alumnos') +
            ' en ' + resumen.secciones + (resumen.secciones === 1 ? ' sección' : ' secciones') + '</p></div></div>' +
            '<div class="tarjeta-filtros-barra"><div class="buscador">' + icono(ICONOS.lupa) +
            '<input type="search" class="control" id="busqueda-alumnos" placeholder="Buscar por nombre, código o encargado" value="' +
            escapar(estado.filtroAlumnos.q) + '"></div>' +
            '<select class="control" id="filtro-alumnos-anio" aria-label="Filtrar por año">' + opcionesAnio + '</select>' +
            '<select class="control" id="filtro-alumnos-seccion" aria-label="Filtrar por sección">' + opcionesSeccion + '</select>' +
            '</div>' +
            '<div class="tabla-envoltura tabla-alta"><table class="tabla"><thead><tr>' +
            '<th>Alumno</th><th>Teléfono</th><th>Encargado</th><th>Estado</th><th></th>' +
            '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
            '</section>' +
            '</div>' +
            '<div class="columna">' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><h3>Resumen del padrón</h3></div>' +
            '<div class="tarjeta-cuerpo compacto"><div class="tarjeta-parametros">' +
            metrica('Alumnos', resumen.alumnos, 'inscritos en el padrón') +
            metrica('Con encargado', resumen.con_encargado, 'viajan acompañados') +
            metrica('Secciones', resumen.secciones, 'con alumnos inscritos') +
            '</div></div></section>' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><div><h2>Secciones</h2>' +
            '<p>Ordenan el padrón por año y grupo</p></div>' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="nueva-seccion">Agregar</button></div>' +
            '<div class="tabla-envoltura tabla-media"><table class="tabla tabla-compacta"><thead><tr>' +
            '<th>Sección</th><th>Año</th><th class="col-derecha">Alumnos</th><th></th>' +
            '</tr></thead><tbody>' + filasSecciones + '</tbody></table></div>' +
            '</section>' +
            '</div>' +
            '</div></div>';
    }

    function filaProfesor(profesor) {
        var permiso = profesor.permiso === 'Concedido'
            ? '<span class="pastilla exito sin-punto">Concedido</span>'
            : '<span class="pastilla error sin-punto">Denegado</span>';

        var detalle = (profesor.sexo === 'M' ? 'Hombre' : 'Mujer') +
            (profesor.especialidad_cargo ? ' · ' + profesor.especialidad_cargo : '');

        return '<tr>' +
            '<td><span class="celda-principal">' + escapar(profesor.nombre) + '</span>' +
            '<span class="celda-secundaria">' + escapar(detalle) + '</span></td>' +
            '<td class="numero celda-codigo">' + escapar(profesor.codigo) + '</td>' +
            '<td>' + permiso + '</td>' +
            '<td>' + (profesor.fecha_nacimiento && profesor.fecha_nacimiento !== '0000-00-00'
                ? fechaCorta(profesor.fecha_nacimiento) : '<span class="sin-dato">Sin fecha</span>') + '</td>' +
            '<td>' + (profesor.activo
                ? '<span class="pastilla primaria sin-punto">Activo</span>'
                : '<span class="pastilla neutra sin-punto">Inactivo</span>') + '</td>' +
            '<td class="columna-acciones">' +
            '<button type="button" class="boton-icono" data-accion="editar-profesor" data-id="' + profesor.id + '" title="Editar profesor">' + icono(ICONOS.lapiz) + '</button>' +
            '<button type="button" class="boton-icono peligro" data-accion="eliminar-profesor" data-id="' + profesor.id + '" title="Eliminar profesor">' + icono(ICONOS.bote) + '</button>' +
            '</td></tr>';
    }

    function vistaProfesores() {
        var encabezado = '<div class="encabezado-vista">' +
            '<div><h1>Profesores</h1><p>Catálogo docente del instituto. De aquí se elige el profesor responsable de cada paseo.</p></div>' +
            '<div class="acciones-vista">' +
            '<button type="button" class="boton boton-borde" data-accion="recargar-profesores">' + icono(ICONOS.refrescar) + 'Actualizar</button>' +
            '<button type="button" class="boton boton-primario" data-accion="nuevo-profesor">' + icono(ICONOS.mas) + 'Nuevo profesor</button>' +
            '</div></div>';

        if (estado.errorProfesores) {
            return '<div class="vista">' + encabezado + '<section class="tarjeta"><div class="estado-vacio">' +
                '<strong>No se pudo cargar el catálogo de profesores</strong>' +
                '<p>' + escapar(estado.errorProfesores) + '</p>' +
                '<button type="button" class="boton boton-primario" data-accion="recargar-profesores">Reintentar</button>' +
                '</div></section></div>';
        }

        if (!estado.profesores) {
            return '<div class="vista">' + encabezado +
                '<div class="cargando"><span class="cargando-barra"></span><p>Cargando el catálogo de profesores</p></div></div>';
        }

        var termino = estado.busquedaProfesores.trim().toLowerCase();

        var lista = estado.profesores.filter(function (profesor) {
            if (!termino) {
                return true;
            }

            return [profesor.nombre, profesor.codigo, profesor.especialidad_cargo, profesor.permiso]
                .join(' ').toLowerCase().indexOf(termino) !== -1;
        });

        var filas = lista.length ? lista.map(filaProfesor).join('')
            : '<tr><td colspan="6"><div class="estado-vacio compacto">' +
              '<strong>Sin profesores que coincidan</strong><p>Ajusta la búsqueda o agrega un profesor nuevo.</p></div></td></tr>';

        var activos = estado.profesores.filter(function (profesor) { return profesor.activo === 1; }).length;
        var concedidos = estado.profesores.filter(function (profesor) { return profesor.permiso === 'Concedido'; }).length;
        var mujeres = estado.profesores.filter(function (profesor) { return profesor.sexo === 'F'; }).length;

        var metrica = function (etiqueta, valor, detalle) {
            return '<div class="parametro-fila"><div><p class="celda-principal">' + etiqueta + '</p>' +
                '<p class="descripcion">' + detalle + '</p></div>' +
                '<div class="parametro-valor"><span class="parametro-fijo numero">' + valor + '</span></div></div>';
        };

        return '<div class="vista">' + encabezado +
            '<div class="rejilla-lateral">' +
            '<div class="columna">' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><div><h2>Catálogo docente</h2>' +
            '<p>' + estado.profesores.length + (estado.profesores.length === 1 ? ' profesor' : ' profesores') + ' registrados</p></div>' +
            '<div class="tarjeta-filtros"><div class="buscador">' + icono(ICONOS.lupa) +
            '<input type="search" class="control" id="busqueda-profesores" placeholder="Buscar por nombre, código o cargo" value="' +
            escapar(estado.busquedaProfesores) + '"></div></div></div>' +
            '<div class="tabla-envoltura tabla-alta"><table class="tabla"><thead><tr>' +
            '<th>Profesor</th><th>Código</th><th>Permiso</th><th>Nacimiento</th><th>Estado</th><th></th>' +
            '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
            '</section>' +
            '</div>' +
            '<div class="columna">' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><h3>Resumen</h3></div>' +
            '<div class="tarjeta-cuerpo compacto"><div class="tarjeta-parametros">' +
            metrica('Profesores', estado.profesores.length, 'en el catálogo del instituto') +
            metrica('Activos', activos, 'disponibles para viajar') +
            metrica('Permiso concedido', concedidos, 'autorizados para salir') +
            metrica('Mujeres', mujeres, (estado.profesores.length - mujeres) + ' hombres') +
            '</div></div></section>' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><h3>Profesor de cada paseo</h3></div>' +
            '<div class="tarjeta-cuerpo compacto">' +
            '<p class="texto-apagado nota-pequena">Al crear o editar un paseo en Administración, el profesor se elige de esta lista: ' +
            'ya no se escribe a mano. Solo los profesores activos aparecen en ese selector.</p>' +
            '<div class="acciones-vista separado">' +
            '<button type="button" class="boton boton-borde" data-accion="ir-administracion">Ir a Administración</button>' +
            '</div></div></section>' +
            '</div>' +
            '</div></div>';
    }

    function abrirModalAlumno(alumnoId) {
        var alumno = null;

        if (alumnoId) {
            alumno = (estado.alumnos || []).filter(function (item) { return item.id === alumnoId; })[0] || null;
        }

        if (alumnoId && !alumno) {
            aviso('Alumno no encontrado', 'Actualiza el padrón e intenta de nuevo.', 'error');
            return;
        }

        var opcionesSeccion = '<option value="">Sin sección</option>' + estado.secciones.map(function (seccion) {
            return '<option value="' + seccion.id + '"' +
                (alumno && alumno.seccion_id === seccion.id ? ' selected' : '') + '>' +
                escapar(seccion.nombre) + ' · ' + seccion.anio + '° año</option>';
        }).join('');

        var contenido = '<form class="formulario" id="formulario-alumno"' +
            (alumno ? ' data-id="' + alumno.id + '"' : '') + '>' +
            '<div class="formulario dos-columnas">' +
            '<div class="campo"><label class="campo-etiqueta" for="alumno-codigo">Código</label>' +
            '<input type="text" class="control" id="alumno-codigo" name="codigo" placeholder="Ej. 2B03" value="' +
            escapar(alumno ? alumno.codigo : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="alumno-nombre">Nombre completo</label>' +
            '<input type="text" class="control" id="alumno-nombre" name="nombre" placeholder="Nombres y apellidos" value="' +
            escapar(alumno ? alumno.nombre : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="alumno-seccion">Sección</label>' +
            '<select class="control" id="alumno-seccion" name="seccion_id">' + opcionesSeccion + '</select></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="alumno-telefono">Teléfono</label>' +
            '<input type="text" class="control" id="alumno-telefono" name="telefono" placeholder="Opcional" value="' +
            escapar(alumno ? alumno.telefono || '' : '') + '"></div>' +
            '</div>' +
            '<div class="campo"><label class="campo-etiqueta" for="alumno-encargado">Encargado</label>' +
            '<input type="text" class="control" id="alumno-encargado" name="encargado" placeholder="Nombre completo del encargado" value="' +
            escapar(alumno ? alumno.encargado || '' : '') + '">' +
            '<p class="campo-ayuda">Déjalo vacío si viaja sin encargado. Si el nombre ya existe en la base de datos se vincula a su ficha; si no, se crea al guardar.</p></div>' +
            '<div class="formulario dos-columnas">' +
            '<div class="campo"><label class="campo-etiqueta" for="alumno-telefono-encargado">Teléfono del encargado</label>' +
            '<input type="text" class="control" id="alumno-telefono-encargado" name="telefono_encargado" placeholder="Opcional" value="' +
            escapar(alumno ? alumno.telefono_encargado || '' : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="alumno-activo">Situación</label>' +
            '<select class="control" id="alumno-activo" name="activo">' +
            '<option value="1"' + (!alumno || alumno.activo ? ' selected' : '') + '>Activo</option>' +
            '<option value="0"' + (alumno && !alumno.activo ? ' selected' : '') + '>Inactivo</option>' +
            '</select></div>' +
            '</div>' +
            '</form>';

        var pie = '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cancelar</button>' +
            '<button type="submit" form="formulario-alumno" class="boton boton-primario">' + icono(ICONOS.cheque) +
            (alumno ? 'Guardar cambios' : 'Agregar al padrón') + '</button></div>';

        modal(alumno ? 'Editar alumno' : 'Nuevo alumno', alumno ? alumno.codigo : 'Padrón del instituto', contenido, pie);
    }

    function abrirModalProfesor(profesorId) {
        var profesor = null;

        if (profesorId) {
            profesor = (estado.profesores || []).filter(function (item) { return item.id === profesorId; })[0] || null;
        }

        if (profesorId && !profesor) {
            aviso('Profesor no encontrado', 'Actualiza el catálogo e intenta de nuevo.', 'error');
            return;
        }

        var contenido = '<form class="formulario" id="formulario-profesor"' +
            (profesor ? ' data-id="' + profesor.id + '"' : '') + '>' +
            '<div class="formulario dos-columnas">' +
            '<div class="campo"><label class="campo-etiqueta" for="profesor-codigo">Código</label>' +
            '<input type="text" class="control" id="profesor-codigo" name="codigo" placeholder="Ej. P032" value="' +
            escapar(profesor ? profesor.codigo : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="profesor-sexo">Sexo</label>' +
            '<select class="control" id="profesor-sexo" name="sexo">' +
            '<option value="M"' + (!profesor || profesor.sexo === 'M' ? ' selected' : '') + '>Hombre (M)</option>' +
            '<option value="F"' + (profesor && profesor.sexo === 'F' ? ' selected' : '') + '>Mujer (F)</option>' +
            '</select></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="profesor-nombres">Nombres</label>' +
            '<input type="text" class="control" id="profesor-nombres" name="nombres" value="' +
            escapar(profesor ? profesor.nombres : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="profesor-apellidos">Apellidos</label>' +
            '<input type="text" class="control" id="profesor-apellidos" name="apellidos" value="' +
            escapar(profesor ? profesor.apellidos : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="profesor-cargo">Cargo o especialidad</label>' +
            '<input type="text" class="control" id="profesor-cargo" name="especialidad_cargo" placeholder="Ej. Desarrollo de Software" value="' +
            escapar(profesor ? profesor.especialidad_cargo : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="profesor-nacimiento">Fecha de nacimiento</label>' +
            '<input type="date" class="control" id="profesor-nacimiento" name="fecha_nacimiento" value="' +
            escapar(profesor && profesor.fecha_nacimiento !== '0000-00-00' ? String(profesor.fecha_nacimiento).slice(0, 10) : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="profesor-permiso">Permiso de salida</label>' +
            '<select class="control" id="profesor-permiso" name="permiso">' +
            '<option value="Concedido"' + (!profesor || profesor.permiso === 'Concedido' ? ' selected' : '') + '>Concedido</option>' +
            '<option value="Denegado"' + (profesor && profesor.permiso === 'Denegado' ? ' selected' : '') + '>Denegado</option>' +
            '</select></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="profesor-registro">Fecha de registro</label>' +
            '<input type="date" class="control" id="profesor-registro" name="fecha_registro" value="' +
            escapar(profesor && profesor.fecha_registro ? String(profesor.fecha_registro).slice(0, 10) : '') + '"></div>' +
            '</div>' +
            '<div class="campo"><label class="campo-etiqueta" for="profesor-alergias">Alergias</label>' +
            '<textarea class="control" id="profesor-alergias" name="alergias" placeholder="Opcional">' +
            escapar(profesor ? profesor.alergias || '' : '') + '</textarea></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="profesor-activo">Situación</label>' +
            '<select class="control" id="profesor-activo" name="activo">' +
            '<option value="1"' + (!profesor || profesor.activo ? ' selected' : '') + '>Activo</option>' +
            '<option value="0"' + (profesor && !profesor.activo ? ' selected' : '') + '>Inactivo</option>' +
            '</select></div>' +
            '</form>';

        var pie = '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cancelar</button>' +
            '<button type="submit" form="formulario-profesor" class="boton boton-primario">' + icono(ICONOS.cheque) +
            (profesor ? 'Guardar cambios' : 'Registrar profesor') + '</button></div>';

        modal(profesor ? 'Editar profesor' : 'Nuevo profesor',
            profesor ? profesor.nombre : 'Catálogo docente', contenido, pie);
    }

    function abrirModalSeccion(seccionId) {
        var seccion = null;

        if (seccionId) {
            seccion = estado.secciones.filter(function (item) { return item.id === seccionId; })[0] || null;
        }

        if (seccionId && !seccion) {
            aviso('Sección no encontrada', 'Actualiza la lista e intenta de nuevo.', 'error');
            return;
        }

        var contenido = '<form class="formulario" id="formulario-seccion"' +
            (seccion ? ' data-id="' + seccion.id + '"' : '') + '>' +
            '<div class="formulario dos-columnas">' +
            '<div class="campo"><label class="campo-etiqueta" for="seccion-nombre">Sección</label>' +
            '<input type="text" class="control" id="seccion-nombre" name="nombre" placeholder="Ej. 2B" value="' +
            escapar(seccion ? seccion.nombre : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="seccion-anio">Año escolar</label>' +
            '<input type="number" class="control numero" id="seccion-anio" name="anio" min="1" max="9" value="' +
            (seccion ? seccion.anio : 1) + '"></div>' +
            '</div>' +
            '<div class="campo"><label class="campo-etiqueta" for="seccion-especialidad">Especialidad</label>' +
            '<input type="text" class="control" id="seccion-especialidad" name="especialidad" placeholder="Ej. Desarrollo de Software" value="' +
            escapar(seccion ? seccion.especialidad || '' : '') + '">' +
            '<p class="campo-ayuda">Si dejas el año vacío se toma de la primera cifra del nombre.</p></div>' +
            '</form>';

        var pie = '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cancelar</button>' +
            '<button type="submit" form="formulario-seccion" class="boton boton-primario">' + icono(ICONOS.cheque) +
            (seccion ? 'Guardar cambios' : 'Crear sección') + '</button></div>';

        modal(seccion ? 'Editar sección' : 'Nueva sección', 'Secciones del instituto', contenido, pie);
    }

    function abrirModalViaje(viajeId, enfocarAlta) {
        estado.viajeModalId = viajeId;
        estado.enfocarAlta = Boolean(enfocarAlta);
        estado.formPasajero = formPasajeroVacio();
        estado.advertenciaCodigo = null;

        apiGet('viajes', { id: viajeId }).then(function (respuesta) {
            estado.viajeModal = respuesta.datos;
            pintarModalViaje();
        }).catch(function (error) {
            aviso('No se pudo abrir el viaje', error.message, 'error');
        });
    }

    /**
     * Estado vacío del formulario de alta de pasajeros.
     *
     * Con el código del estudiante ya no hace falta escribir el nombre: el
     * padrón lo resuelve (en el navegador y también en el servidor), y los
     * compañeros de viaje se guardan como una lista de códigos.
     */
    function formPasajeroVacio() {
        return {
            nombre: '',
            codigo: '',
            encargado: '',
            companeros: [],
            alumnoId: null,
            codigoAlumno: '',
            nombreAutomatico: false,
            conEncargado: false
        };
    }

    function normalizarCodigoCliente(valor) {
        return String(valor === null || valor === undefined ? '' : valor).trim().toUpperCase();
    }

    function cerrarSugerencias() {
        // También se cancela lo que esté pendiente: un resultado que llegue
        // tarde no debe abrir la lista de nuevo.
        if (estado.temporizadorSugerencias) {
            window.clearTimeout(estado.temporizadorSugerencias);
            estado.temporizadorSugerencias = null;
        }

        ['sugerencias-pasajero', 'sugerencias-companero'].forEach(function (id) {
            var contenedor = document.getElementById(id);

            if (contenedor) {
                contenedor.hidden = true;
                contenedor.innerHTML = '';
            }
        });
    }

    /**
     * Busca en el padrón por código o nombre; se usa para autocompletar el
     * alta de pasajeros sin cargar la lista completa de alumnos.
     */
    function buscarEnPadron(texto) {
        return apiGet('alumnos', { q: texto, limite: 8 }).then(function (respuesta) {
            return (respuesta.datos && respuesta.datos.alumnos) || [];
        }).catch(function () {
            return [];
        });
    }

    function pintarSugerenciasAlumnos(tipo, alumnos) {
        var contenedor = document.getElementById(tipo === 'companero' ? 'sugerencias-companero' : 'sugerencias-pasajero');

        if (!contenedor) {
            return;
        }

        if (!alumnos.length) {
            contenedor.hidden = true;
            contenedor.innerHTML = '';
            return;
        }

        contenedor.innerHTML = alumnos.map(function (alumno) {
            return '<button type="button" class="sugerencia" role="option" data-accion="elegir-sugerencia"' +
                ' data-tipo="' + tipo + '" data-id="' + alumno.id + '"' +
                ' data-codigo="' + escapar(alumno.codigo) + '" data-nombre="' + escapar(alumno.nombre) + '"' +
                ' data-encargado="' + escapar(alumno.encargado || '') + '"' +
                ' data-seccion="' + escapar(alumno.seccion || '') + '">' +
                '<span class="sugerencia-codigo">' + escapar(alumno.codigo) + '</span>' +
                '<span class="sugerencia-datos"><strong>' + escapar(alumno.nombre) + '</strong>' +
                '<small>' + escapar(alumno.seccion || 'Sin sección') + '</small></span></button>';
        }).join('');

        contenedor.hidden = false;
    }

    /**
     * Escribe un resultado del padrón en el formulario: código y nombre quedan
     * listos y el encargado llega solo si el alumno viaja acompañado.
     */
    function elegirAlumnoSugerido(datos) {
        estado.formPasajero.alumnoId = Number(datos.id) || null;
        estado.formPasajero.codigoAlumno = datos.codigo;
        estado.formPasajero.codigo = datos.codigo;
        estado.formPasajero.nombre = datos.nombre;
        estado.formPasajero.nombreAutomatico = true;

        var codigo = $('#pasajero-codigo');
        var nombre = $('#pasajero-nombre');
        var alumno = $('#pasajero-alumno');
        var ayuda = $('#ayuda-pasajero');

        if (codigo) {
            codigo.value = datos.codigo;
            validarFormatoCodigo(codigo);
        }

        if (nombre) {
            nombre.value = datos.nombre;
        }

        if (alumno) {
            alumno.value = datos.id;
        }

        if (ayuda) {
            ayuda.innerHTML = 'Del padrón · <strong>' + escapar(datos.nombre) + '</strong>' +
                (datos.seccion ? ' · sección ' + escapar(datos.seccion) : '');
            ayuda.classList.remove('ayuda-error');
        }

        // El encargado del padrón se trae solo si se activa el "Viaja con encargado".
        if (datos.encargado) {
            estado.formPasajero.encargado = datos.encargado;
            estado.formPasajero.conEncargado = false;

            var campoEncargado = $('#pasajero-encargado');
            var casilla = $('#pasajero-con-encargado');

            if (campoEncargado) {
                campoEncargado.value = '';
            }

            if (casilla) {
                casilla.checked = false;
            }

            alternarEncargado(false);
        }

        cerrarSugerencias();
    }

    function pintarChipsCompaneros() {
        var contenedor = $('#chips-companeros');

        if (!contenedor) {
            return;
        }

        var codigos = estado.formPasajero.companeros || [];

        contenedor.innerHTML = codigos.map(function (codigo) {
            return '<span class="chip">' + escapar(codigo) +
                '<button type="button" class="chip-quitar" data-accion="quitar-companero" data-codigo="' +
                escapar(codigo) + '" aria-label="Quitar al compañero ' + escapar(codigo) + '">' +
                icono(ICONOS.cerrar) + '</button></span>';
        }).join('');

        contenedor.classList.toggle('oculto', codigos.length === 0);
    }

    /**
     * Agrega un compañero de viaje al grupo: el formato es el mismo que el del
     * estudiante y el duplicado simplemente se ignora.
     */
    function agregarCompanero(valor) {
        var codigo = normalizarCodigoCliente(valor);

        if (codigo === '') {
            return;
        }

        if (!/^\d{1,2}[A-Za-z]\d{2}$/.test(codigo)) {
            aviso('Código no válido', 'Usa el formato 2B03: año, sección y número de lista.', 'error');
            return;
        }

        if (codigo === normalizarCodigoCliente(estado.formPasajero.codigo)) {
            aviso('Ese es el propio estudiante', 'Elige otro código para sentarlos juntos.', 'error');
            return;
        }

        var lista = estado.formPasajero.companeros || [];

        if (lista.indexOf(codigo) !== -1) {
            return;
        }

        lista.push(codigo);
        estado.formPasajero.companeros = lista;
        pintarChipsCompaneros();

        var campo = $('#pasajero-companero');

        if (campo) {
            campo.value = '';
            campo.focus();
        }

        cerrarSugerencias();
    }

    function quitarCompanero(codigo) {
        estado.formPasajero.companeros = (estado.formPasajero.companeros || []).filter(function (item) {
            return item !== codigo;
        });

        pintarChipsCompaneros();
    }

    /**
     * Retardo antes de consultar el padrón: mientras se escribe no se manda
     * una petición por cada letra.
     */
    function programarSugerencias(tipo, texto) {
        if (estado.temporizadorSugerencias) {
            window.clearTimeout(estado.temporizadorSugerencias);
            estado.temporizadorSugerencias = null;
        }

        var limpio = String(texto || '').trim();

        if (limpio === '') {
            cerrarSugerencias();
            return;
        }

        estado.temporizadorSugerencias = window.setTimeout(function () {
            estado.temporizadorSugerencias = null;

            buscarEnPadron(limpio).then(function (alumnos) {
                var idCampo = tipo === 'companero' ? 'pasajero-companero' : 'pasajero-codigo';
                var campo = document.getElementById(idCampo);

                // Si el campo cambió mientras viajaba la petición, la respuesta
                // ya no corresponde y se descarta.
                if (!campo || campo.value.trim().toUpperCase() !== limpio.toUpperCase()) {
                    return;
                }

                pintarSugerenciasAlumnos(tipo, alumnos);
            });
        }, 180);
    }

    /**
     * Resalta con las flechas la sugerencia activa y, con Enter, la elige.
     * Devuelve true cuando el teclado fue consumido por la lista.
     */
    function moverSugerencia(evento, contenedor) {
        if (!contenedor || contenedor.hidden || !contenedor.children.length) {
            return false;
        }

        var opciones = Array.prototype.slice.call(contenedor.children);
        var activa = contenedor.querySelector('.activa');
        var posicion = opciones.indexOf(activa);

        if (evento.key === 'ArrowDown') {
            posicion = posicion + 1 >= opciones.length ? 0 : posicion + 1;
        } else if (evento.key === 'ArrowUp') {
            posicion = posicion <= 0 ? opciones.length - 1 : posicion - 1;
        } else if (evento.key === 'Enter') {
            evento.preventDefault();
            (activa || opciones[0]).click();
            return true;
        } else if (evento.key === 'Escape') {
            cerrarSugerencias();
            return true;
        } else {
            return false;
        }

        evento.preventDefault();
        opciones.forEach(function (opcion, indice) {
            opcion.classList.toggle('activa', indice === posicion);
        });
        opciones[posicion].scrollIntoView({ block: 'nearest' });

        return true;
    }

    function pintarModalViaje() {
        var viaje = estado.viajeModal;

        if (!viaje) {
            return;
        }

        var advertencia = '';

        if (estado.advertenciaCodigo) {
            var coincidencias = estado.advertenciaCodigo.coincidencias.map(function (item) {
                return '<li><strong>' + escapar(item.nombre) + '</strong> · código ' + escapar(item.codigo) + ' · ' +
                    (item.encargado ? 'encargado: ' + escapar(item.encargado) : 'sin encargado asignado') + '</li>';
            }).join('');

            advertencia = '<div class="alerta alerta-error alerta-separada">' +
                '<strong>Código repetido</strong>' +
                '<span>Ese código ya está asignado a otro estudiante en este viaje:</span>' +
                '<ul class="alerta-lista">' + coincidencias + '</ul>' +
                '<div class="alerta-acciones">' +
                '<button type="button" class="boton boton-peligro boton-pequeno" data-accion="forzar-pasajero">Registrar de todos modos</button>' +
                '<button type="button" class="boton boton-borde boton-pequeno" data-accion="descartar-advertencia">Cambiar el código</button>' +
                '</div></div>';
        }

        var filas = viaje.pasajeros_lista.length ? viaje.pasajeros_lista.map(function (pasajero) {
            var filaPrincipal = '<tr>' +
                '<td><span class="orden-inscripcion">' + pasajero.orden + '</span></td>' +
                '<td><span class="celda-principal">' + escapar(pasajero.nombre) + '</span>' +
                (pasajero.encargado ? '<span class="celda-secundaria">Encargado: ' + escapar(pasajero.encargado) + '</span>' : '') +
                (pasajero.duplicado ? '<span class="pastilla error sin-punto linea">Código repetido</span>' : '') +
                (pasajero.companeros && pasajero.companeros.length ? '<span class="celda-secundaria">Se sienta con ' + escapar(pasajero.companeros.join(', ')) + '</span>' : '') + '</td>' +
                '<td class="numero celda-codigo">' + escapar(pasajero.codigo) + '</td>' +
                '<td>' + (pasajero.encargado ? escapar(pasajero.encargado) : '<span class="sin-dato">Sin encargado</span>') + '</td>' +
                '<td class="columna-media numero">' + dinero(pasajero.costo) +
                (pasajero.encargado ? '<span class="celda-secundaria">incluye encargado</span>' : '') + '</td>' +
                '<td class="columna-media numero">' + dinero(pasajero.pagado) +
                (pasajero.pendiente > 0 ? '<span class="celda-secundaria">faltan ' + dinero(pasajero.pendiente) + '</span>' : '') + '</td>' +
                '<td class="columna-acciones"><button type="button" class="boton-icono peligro" data-accion="quitar-pasajero" data-id="' + pasajero.id + '" title="Retirar del viaje">' + icono(ICONOS.bote) + '</button></td>' +
                '</tr>';

            // Renderizar compañeros anidados bajo el alumno principal.
            var filasCompaneros = (pasajero.companeros || []).map(function (codigo) {
                return '<tr class="fila-companero">' +
                    '<td></td>' +
                    '<td><span class="celda-secundaria">Compañero de ' + escapar(pasajero.nombre) + ' · ' + escapar(codigo) + '</span></td>' +
                    '<td class="numero celda-codigo">' + escapar(codigo) + '</td>' +
                    '<td><span class="sin-dato">—</span></td>' +
                    '<td class="columna-media numero">' + dinero(viaje.costo_persona) + '</td>' +
                    '<td class="columna-media numero">' + dinero(viaje.costo_persona) + '</td>' +
                    '<td></td>' +
                    '</tr>';
            }).join('');

            return filaPrincipal + filasCompaneros;
        }).join('') : '<tr><td colspan="7"><div class="estado-vacio compacto"><strong>Sin estudiantes</strong><p>Agrega al primer estudiante del viaje.</p></div></td></tr>';

        var pagos = viaje.pagos.length ? viaje.pagos.map(function (pago) {
            return '<tr>' +
                '<td>' + (pago.pasajero_nombre ? escapar(pago.pasajero_nombre) : '<span class="sin-dato">Pago general</span>') + '</td>' +
                '<td class="numero">' + dinero(pago.monto) + '</td>' +
                '<td>' + escapar(pago.metodo.charAt(0).toUpperCase() + pago.metodo.slice(1)) + '</td>' +
                '<td class="numero">' + escapar(fechaCorta(pago.fecha)) + '</td>' +
                '<td class="columna-acciones"><button type="button" class="boton-icono peligro" data-accion="anular-pago" data-id="' + pago.id + '" title="Anular pago">' + icono(ICONOS.bote) + '</button></td>' +
                '</tr>';
        }).join('') : '<tr><td colspan="5"><p class="texto-apagado nota-pequena">Sin pagos registrados.</p></td></tr>';

        var opcionesPasajeros = '<option value="">Pago general del viaje</option>' + viaje.pasajeros_lista.map(function (pasajero) {
            return '<option value="' + pasajero.id + '" data-costo="' + pasajero.costo + '" data-pendiente="' + pasajero.pendiente + '"' +
                ' data-encargado="' + (pasajero.encargado ? '1' : '0') + '">' + escapar(pasajero.nombre) + ' · ' + escapar(pasajero.codigo) +
                (pasajero.encargado ? ' (+ encargado)' : '') + '</option>';
        }).join('');

        var contenido = '<div class="modal-rejilla">' +
            '<div class="columna columna-espaciada">' +
            '<section class="tarjeta"><div class="tarjeta-cabecera"><div><h3>Estudiantes pasajeros</h3><p>' + viaje.pasajeros_lista.length + ' inscritos · ordenados según se agregaron</p></div></div>' +
            '<div class="tarjeta-cuerpo compacto">' + advertencia +
            (viaje.boletos_cerrados
                ? '<div class="alerta alerta-atencion"><strong>Boletos cerrados</strong>' +
                  '<span>Ya no se pueden inscribir más estudiantes en este viaje. El listado de estudiantes está disponible.</span></div></div>'
                : '<form class="formulario" id="formulario-pasajero">' +
            '<div class="formulario dos-columnas compacto-campos">' +
            '<div class="campo"><label class="campo-etiqueta" for="pasajero-codigo">Código del estudiante</label>' +
            '<div class="control-envoltura">' +
            '<input type="text" class="control" id="pasajero-codigo" name="codigo" placeholder="Ej. 2B03" maxlength="6" autocomplete="off" value="' + escapar(estado.formPasajero.codigo) + '">' +
            '<div class="autocompletar" id="sugerencias-pasajero" role="listbox" hidden></div>' +
            '</div>' +
            '<input type="hidden" id="pasajero-alumno" name="alumno_id" value="' + (estado.formPasajero.alumnoId || '') + '">' +
            '<span class="campo-ayuda" id="ayuda-pasajero">Con el código basta: el nombre se completa con el padrón.</span></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="pasajero-nombre">Nombre del estudiante</label>' +
            '<input type="text" class="control" id="pasajero-nombre" name="nombre" placeholder="Se escribe solo si el código no está en el padrón" value="' + escapar(estado.formPasajero.nombre) + '"></div>' +
            '</div>' +
            '<div class="campo"><label class="campo-etiqueta" for="pasajero-companero">Compañeros de viaje</label>' +
            '<div class="chips oculto" id="chips-companeros"></div>' +
            '<div class="control-envoltura">' +
            '<input type="text" class="control" id="pasajero-companero" placeholder="Escribe un código: 2B07" maxlength="6" autocomplete="off">' +
            '<div class="autocompletar" id="sugerencias-companero" role="listbox" hidden></div>' +
            '</div>' +
            '<span class="campo-ayuda">Opcional. Agrega todos los códigos del grupito y se les asignan asientos juntos.</span></div>' +
            '<div class="campo campo-casilla"><input type="checkbox" id="pasajero-con-encargado"' + (estado.formPasajero.conEncargado ? ' checked' : '') + '>' +
            '<label for="pasajero-con-encargado">Viaja con encargado</label></div>' +
            '<p class="campo-ayuda' + (estado.formPasajero.conEncargado ? '' : ' oculto') + '" id="aviso-encargado">El encargado ocupa un asiento y suma el costo por persona del paseo.</p>' +
            '<div class="campo' + (estado.formPasajero.conEncargado ? '' : ' oculto') + '" id="campo-encargado"><label class="campo-etiqueta" for="pasajero-encargado">Nombre del encargado</label>' +
            '<input type="text" class="control" id="pasajero-encargado" name="encargado" placeholder="Nombre del encargado" value="' + escapar(estado.formPasajero.encargado) + '"></div>' +
            '<div class="grupo-botones inicio">' +
            '<button type="submit" class="boton boton-primario">' + icono(ICONOS.mas) + 'Agregar estudiante</button>' +
            '</div></form></div>') +
            '<div class="tabla-envoltura tabla-media"><table class="tabla tabla-compacta"><thead><tr>' +
            '<th class="col-orden">Orden</th><th>Estudiante</th><th>Código</th><th>Encargado</th><th class="col-derecha">Costo</th><th class="col-derecha">Pagado</th><th></th>' +
            '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
            '<section class="tarjeta"><div class="tarjeta-cabecera"><div><h3>Datos del viaje</h3><p>Horario, capacidad y estado del autobús</p></div>' +
            '<div class="acciones-vista"><button type="button" class="boton boton-borde boton-pequeno" data-accion="abrir-redistribucion" data-id="' + viaje.id + '">Redistribuir pasajeros</button></div></div>' +
            '<div class="tarjeta-cuerpo compacto"><form class="formulario dos-columnas" id="formulario-viaje">' +
            '<div class="campo"><label class="campo-etiqueta" for="viaje-fecha">Día del viaje</label>' +
            '<input type="date" class="control" id="viaje-fecha" name="fecha" value="' + escapar(viaje.fecha) + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="viaje-salida">Hora de salida</label>' +
            '<input type="time" class="control" id="viaje-salida" name="hora_salida" value="' + escapar(viaje.hora_salida) + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="viaje-retorno">Hora estimada de regreso</label>' +
            '<input type="time" class="control" id="viaje-retorno" name="hora_retorno" value="' + escapar(viaje.hora_retorno || '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="viaje-capacidad">Capacidad máxima del bus</label>' +
            '<input type="number" class="control numero" id="viaje-capacidad" name="capacidad_bus" min="' + viaje.ocupados + '" value="' + viaje.capacidad_bus + '">' +
            '<span class="campo-ayuda">Quedan ' + viaje.cupos_disponibles + ' cupos. Se cuentan ' + viaje.pasajeros + ' estudiantes, ' +
            viaje.acompanantes + ' acompañantes y ' + viaje.asientos_personal + ' asientos de personal.</span></div>' +
            '<div class="campo ancho-completo"><label class="campo-etiqueta" for="viaje-notas">Notas para la colecturía</label>' +
            '<textarea class="control" id="viaje-notas" name="notas" placeholder="Indicaciones especiales del viaje">' + escapar(viaje.notas || '') + '</textarea></div>' +
            '<div class="campo ancho-completo"><div class="grupo-botones">' +
            '<button type="submit" class="boton boton-primario">' + icono(ICONOS.cheque) + 'Guardar cambios</button>' +
            '</div></div>' +
            '</form></div></section>' +
            '</section>' +
            '</div>' +
            '<div class="columna columna-espaciada">' +
            '<section class="tarjeta"><div class="tarjeta-cabecera"><h3>Resumen</h3></div>' +
            '<div class="tarjeta-cuerpo compacto"><dl class="lista-datos">' +
            '<div><dt>Destino</dt><dd>' + escapar(viaje.destino) + '</dd></div>' +
            '<div><dt>Bus</dt><dd>Bus ' + (viaje.bus_numero || 1) + ' de ' + (viaje.buses || []).length + '</dd></div>' +
            '<div><dt>Fecha</dt><dd>' + escapar(fechaCorta(viaje.fecha)) + '</dd></div>' +
            '<div><dt>Salida</dt><dd class="numero">' + escapar(viaje.hora_salida) + '</dd></div>' +
            '<div><dt>Regreso</dt><dd class="numero">' + escapar(viaje.hora_retorno || 'Por definir') + '</dd></div>' +
            '<div><dt>Costo por persona</dt><dd class="numero">' + dinero(viaje.costo_persona) + '</dd></div>' +
            '<div><dt>Estudiantes</dt><dd class="numero">' + viaje.pasajeros + '</dd></div>' +
            '<div><dt>Acompañantes</dt><dd class="numero">' + viaje.acompanantes + '</dd></div>' +
            '<div><dt>Personas que pagan</dt><dd class="numero">' + viaje.personas + '</dd></div>' +
            '<div><dt>Costo esperado</dt><dd class="numero">' + dinero(viaje.esperado) + '</dd></div>' +
            '<div><dt>Recaudado</dt><dd class="numero">' + dinero(viaje.recaudado) + '</dd></div>' +
            '<div><dt>Por cobrar</dt><dd class="numero">' + dinero(viaje.pendiente) + '</dd></div>' +
            '<div><dt>Profesor</dt><dd>' + escapar(viaje.profesor_encargado) + '</dd></div>' +
            '</dl></div></section>' +
            '<section class="tarjeta"><div class="tarjeta-cabecera"><h3>Pagos</h3>' +
            '<span class="texto-apagado nota-pequena">Los pagos se registran automáticamente al agregar un estudiante.</span></div>' +
            '<div class="tarjeta-cuerpo compacto">' +
            '<p class="texto-apagado nota-pequena">El monto cubierto por cada estudiante se muestra en la columna «Pagado» de la lista.</p>' +
            '</div></section>' +
            '</div>' +
            '</div>';

        var accionesPie;

        if (viaje.estado === 'finalizado') {
            accionesPie = '<button type="button" class="boton boton-primario" data-accion="generar-listado-salida" data-id="' + viaje.id + '">' +
                icono(ICONOS.lista) + 'Ver listado de estudiantes</button>' +
                '<button type="button" class="boton boton-secundario" data-accion="cambiar-estado" data-estado="programado">Reabrir viaje</button>';
        } else if (viaje.boletos_cerrados) {
            accionesPie = '<button type="button" class="boton boton-primario" data-accion="generar-listado-salida" data-id="' + viaje.id + '">' +
                icono(ICONOS.lista) + 'Ver listado de estudiantes</button>' +
                '<button type="button" class="boton boton-secundario" data-accion="cambiar-estado" data-estado="finalizado">Finalizar viaje ahora</button>';
        } else {
            accionesPie = '<button type="button" class="boton boton-secundario" data-accion="cerrar-boletos" data-id="' + viaje.id + '">' +
                icono(ICONOS.cheque) + 'Cerrar boletos</button>';
        }

        var pie = '<span class="texto-apagado nota-pequena">Orden de inscripción · ' + viaje.pasajeros_lista.length + ' estudiantes</span>' +
            '<div class="grupo-botones">' +
            '<button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cerrar</button>' +
            accionesPie +
            '</div>';

        modal('Gestionar viaje', viaje.nombre, contenido, pie, true);

        pintarChipsCompaneros();

        if (estado.enfocarAlta) {
            estado.enfocarAlta = false;
            var formularioAlta = $('#formulario-pasajero');

            if (formularioAlta) {
                formularioAlta.scrollIntoView({ block: 'center' });
                var codigo = $('#pasajero-codigo');

                if (codigo) {
                    codigo.focus();
                }
            }
        }

        if (estado.enfocarCobro) {
            var pasajeroId = estado.enfocarCobro;
            estado.enfocarCobro = null;
            var selectorPago = $('#pago-pasajero');

            if (selectorPago) {
                selectorPago.value = String(pasajeroId);
                selectorPago.dispatchEvent(new Event('change', { bubbles: true }));

                var formularioPago = $('#formulario-pago');

                if (formularioPago) {
                    formularioPago.scrollIntoView({ block: 'center' });
                }

                var montoCampo = $('#pago-monto');

                if (montoCampo) {
                    montoCampo.focus();
                    montoCampo.select();
                }
            }
        }
    }

    function abrirModalDesborde(contexto) {
        estado.desborde = contexto;

        var detalles = contexto.detalles || {};
        var buses = detalles.buses || [];
        var minimo = (detalles.ocupados || 0) + (detalles.requiere || 1);

        var opciones = buses.map(function (bus) {
            return '<option value="' + bus.id + '">Bus ' + bus.numero + ' · ' + bus.hora_salida +
                ' · ' + bus.cupos_disponibles + ' cupos libres</option>';
        }).join('');

        var contenido = '<div class="alerta alerta-atencion">' +
            '<strong>Este bus ya está lleno</strong>' +
            '<span>El bus tiene ' + (detalles.ocupados || 0) + ' de ' + (detalles.capacidad || 0) +
            ' asientos ocupados y se necesitan ' + (detalles.requiere || 1) + ' lugar(es). ' +
            'Elige cómo acomodar a la persona que se está agregando.</span>' +
            '</div>' +
            (buses.length
                ? '<div class="campo"><label class="campo-etiqueta" for="desborde-destino">Acomodar en otro bus de la salida</label>' +
                '<select class="control" id="desborde-destino" name="viaje_destino">' +
                '<option value="">Selecciona un bus</option>' + opciones + '</select>' +
                '<span class="campo-ayuda">El bus de destino recalcula sus cupos al instante.</span></div>'
                : '<p class="texto-apagado nota-pequena">Los demás buses de la salida no tienen cupos libres.</p>') +
            '<div class="campo"><label class="campo-etiqueta" for="desborde-capacidad">O amplíalo hasta</label>' +
            '<input type="number" class="control numero" id="desborde-capacidad" name="capacidad_bus" min="' + minimo + '" value="' + minimo + '">' +
            '<span class="campo-ayuda">Aumenta la capacidad del bus actual para que la persona quepa.</span></div>';

        var pie = '<div class="grupo-botones">' +
            '<button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cancelar</button>' +
            '<button type="button" class="boton boton-secundario" data-accion="desborde-ampliar">Ampliar este bus</button>' +
            '<button type="button" class="boton boton-borde" data-accion="desborde-mover"' + (buses.length ? '' : ' disabled') + '>Mover a otro bus</button>' +
            '<button type="button" class="boton boton-primario" data-accion="desborde-crear-bus">Crear bus y acomodar</button>' +
            '</div>';

        modal('El bus está lleno', 'Cupos agotados', contenido, pie, true);
    }

    function abrirModalRedistribucion(viajeId) {
        apiGet('salidas', { viaje_id: viajeId }).then(function (respuesta) {
            estado.salida = respuesta.datos;
            pintarModalRedistribucion();
        }).catch(function (error) {
            aviso('No se pudo abrir la redistribución', error.message, 'error');
        });
    }

    function pintarModalRedistribucion() {
        var salida = estado.salida;

        if (!salida) {
            return;
        }

        var buses = salida.buses.map(function (bus) {
            var porcentaje = bus.capacidad_bus > 0 ? Math.round((bus.ocupados / bus.capacidad_bus) * 100) : 0;
            var claseBarra = porcentaje >= 100 ? 'error' : (porcentaje >= 85 ? 'atencion' : '');
            var estadoBus = bus.estado === 'finalizado' ? 'Finalizado' : (bus.estado === 'en_curso' ? 'En curso' : 'Programado');

            var lista = bus.lista.length ? bus.lista.map(function (pasajero) {
                return '<label class="movible">' +
                    '<input type="checkbox" name="pasajeros[]" value="' + pasajero.id + '" data-viaje="' + bus.id + '">' +
                    '<span class="movible-datos"><span class="celda-principal">' + escapar(pasajero.nombre) + '</span>' +
                    '<span class="celda-secundaria">' + escapar(pasajero.codigo) +
                    (pasajero.encargado ? ' · con ' + escapar(pasajero.encargado) : '') + '</span></span>' +
                    '<span class="pastilla neutra sin-punto">' + pasajero.personas + '</span>' +
                    '</label>';
            }).join('') : '<p class="texto-apagado nota-pequena">Sin estudiantes en este bus.</p>';

            return '<article class="tarjeta-bus">' +
                '<header class="tarjeta-bus-cabecera"><div>' +
                '<span class="metrica-etiqueta">Bus ' + bus.numero + '</span>' +
                '<h3>' + escapar(bus.hora_salida) + '</h3>' +
                '<p class="celda-secundaria sin-margen">' + escapar(fechaCorta(bus.fecha)) +
                (bus.hora_retorno ? ' — ' + escapar(bus.hora_retorno) : '') + '</p>' +
                '</div><span class="pastilla neutra sin-punto">' + estadoBus + '</span></header>' +
                '<div class="ocupacion compacta">' +
                '<div class="ocupacion-cabecera"><span>' + bus.pasajeros + ' estudiantes · ' + bus.acompanantes +
                ' acompañantes</span><strong class="numero">' + bus.ocupados + ' / ' + bus.capacidad_bus + '</strong></div>' +
                '<div class="barra"><span class="barra-relleno ' + claseBarra + '" style="width:' + Math.min(100, porcentaje) + '%"></span></div>' +
                '<div class="ocupacion-cabecera"><span>' + bus.cupos_disponibles + ' cupos libres</span>' +
                '<span class="numero">' + porcentaje + '%</span></div>' +
                '</div>' +
                '<div class="lista-movibles">' + lista + '</div>' +
                '</article>';
        }).join('');

        var opciones = salida.buses.map(function (bus) {
            return '<option value="' + bus.id + '">Bus ' + bus.numero + ' · ' + bus.hora_salida +
                ' · ' + bus.cupos_disponibles + ' cupos libres</option>';
        }).join('');

        var contenido = '<div class="alerta alerta-info">' +
            '<strong>' + escapar(salida.salida.nombre) + '</strong>' +
            '<span>' + escapar(salida.salida.destino) + ' · ' + escapar(fechaCorta(salida.salida.fecha)) +
            ' · salida ' + escapar(salida.salida.hora_salida) + ' · ' + salida.buses.length + ' bus(es) en esta salida</span>' +
            '</div>' +
            '<div class="rejilla-buses">' + buses + '</div>' +
            '<div class="barra-acciones">' +
            '<div class="campo"><label class="campo-etiqueta" for="redistribucion-destino">Mover los seleccionados al bus</label>' +
            '<select class="control" id="redistribucion-destino" name="viaje_destino">' + opciones + '</select></div>' +
            '<div class="grupo-botones">' +
            '<button type="button" class="boton boton-secundario" data-accion="redistribucion-repartir">Repartir automáticamente</button>' +
            '<button type="button" class="boton boton-primario" data-accion="redistribucion-mover">Mover seleccionados</button>' +
            '</div></div>' +
            '<form class="formulario" id="formulario-nuevo-bus">' +
            '<div class="formulario dos-columnas compacto-campos">' +
            '<div class="campo"><label class="campo-etiqueta" for="bus-capacidad">Capacidad del bus nuevo</label>' +
            '<input type="number" class="control numero" id="bus-capacidad" name="capacidad_bus" min="' + (salida.salida.asientos_personal + 1) + '" value="' + salida.salida.capacidad_bus + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="bus-fecha">Día del viaje</label>' +
            '<input type="date" class="control" id="bus-fecha" name="fecha" value="' + escapar(salida.salida.fecha) + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="bus-salida">Hora de salida</label>' +
            '<input type="time" class="control" id="bus-salida" name="hora_salida" value="' + escapar(salida.salida.hora_salida) + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="bus-retorno">Hora estimada de regreso</label>' +
            '<input type="time" class="control" id="bus-retorno" name="hora_retorno" value="' + escapar(salida.salida.hora_retorno || '') + '"></div>' +
            '</div>' +
            '<div class="grupo-botones inicio"><button type="submit" class="boton boton-borde">' + icono(ICONOS.mas) + 'Crear bus adicional</button></div>' +
            '</form>';

        var pie = '<span class="texto-apagado nota-pequena">Los cupos y los planos de asientos se recalculan al mover a los estudiantes.</span>' +
            '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cerrar</button></div>';

        modal('Redistribuir pasajeros', salida.salida.nombre, contenido, pie, true);
    }

    function pintarListadoSalida(datos) {
        if (!datos || !datos.buses) {
            return;
        }

        var contador = 0;
        var totalEstudiantes = 0;
        var totalRecaudado = 0;
        var totalPendiente = 0;

        var bloques = datos.buses.map(function (bus) {
            // Pagados al 100% primero, luego los pagos parciales y al final los pendientes.
            var ordenados = bus.lista.map(function (pasajero, indice) {
                var prioridad = pasajero.pendiente <= 0 ? 0 : (pasajero.pagado > 0 ? 1 : 2);
                return { pasajero: pasajero, indice: indice, prioridad: prioridad };
            }).sort(function (a, b) {
                return a.prioridad - b.prioridad || a.indice - b.indice;
            });

            var recaudadoBus = 0;
            var pendienteBus = 0;

            var filas = ordenados.map(function (item) {
                var pasajero = item.pasajero;

                contador++;
                totalEstudiantes++;
                recaudadoBus += pasajero.pagado;
                pendienteBus += pasajero.pendiente;

                var pastillaPago = item.prioridad === 0
                    ? '<span class="pastilla exito sin-punto">Pagado</span>'
                    : (item.prioridad === 1
                        ? '<span class="pastilla atencion sin-punto">Parcial</span>'
                        : '<span class="pastilla error sin-punto">Pendiente</span>');

                return '<tr>' +
                    '<td><span class="orden-inscripcion">' + contador + '</span></td>' +
                    '<td><span class="celda-principal">' + escapar(pasajero.nombre) + '</span>' +
                    '<span class="celda-secundaria">' + escapar(pasajero.codigo) +
                    (pasajero.asiento ? ' · asiento ' + pasajero.asiento : ' · sin asignar') + '</span></td>' +
                    '<td>' + (pasajero.encargado ? escapar(pasajero.encargado) : '<span class="sin-dato">Sin encargado</span>') + '</td>' +
                    '<td class="columna-media numero">' + dinero(pasajero.costo) + '</td>' +
                    '<td class="columna-media numero">' + dinero(pasajero.pagado) + '</td>' +
                    '<td class="columna-media numero">' + (pasajero.pendiente > 0 ? dinero(pasajero.pendiente) : '<span class="sin-dato">—</span>') + '</td>' +
                    '<td class="columna-media">' + pastillaPago + '</td>' +
                    '</tr>';
            }).join('');

            totalRecaudado += recaudadoBus;
            totalPendiente += pendienteBus;

            var tabla = filas
                ? '<div class="tabla-envoltura"><table class="tabla tabla-compacta">' +
                  '<thead><tr><th>#</th><th>Estudiante</th><th>Encargado</th>' +
                  '<th class="columna-media">Costo</th><th class="columna-media">Pagado</th>' +
                  '<th class="columna-media">Pendiente</th><th class="columna-media">Pago</th></tr></thead>' +
                  '<tbody>' + filas + '</tbody></table></div>'
                : '<p class="texto-apagado nota-pequena">Este bus todavía no tiene estudiantes asignados.</p>';

            return '<article class="tarjeta-bus">' +
                '<header class="tarjeta-bus-cabecera"><div>' +
                '<span class="metrica-etiqueta">Bus ' + bus.numero + ' de ' + datos.buses.length + '</span>' +
                '<h3>' + escapar(bus.hora_salida) + '</h3>' +
                '<p class="celda-secundaria sin-margen">' + bus.pasajeros + ' estudiantes · ' +
                bus.ocupados + ' / ' + bus.capacidad_bus + ' asientos ocupados</p>' +
                '</div>' +
                '<div class="grupo-botones">' +
                '<a class="boton boton-borde boton-pequeno" href="listado.php?viaje=' + bus.id + '" target="_blank" rel="noopener">Exportar PDF</a>' +
                '</div></header>' +
                tabla +
                '<div class="listado-salida-total">' +
                '<span>Subtotal recaudado <strong class="numero">' + dinero(recaudadoBus) + '</strong></span>' +
                '<span>Pendiente <strong class="numero">' + dinero(pendienteBus) + '</strong></span>' +
                '</div>' +
                '</article>';
        }).join('');

        var contenido = '<div class="alerta alerta-info">' +
            '<strong>' + escapar(datos.salida.nombre) + '</strong>' +
            '<span>' + escapar(datos.salida.destino) + ' · ' + escapar(fechaCorta(datos.salida.fecha)) +
            ' · salida ' + escapar(datos.salida.hora_salida) + ' · ' + datos.buses.length +
            ' bus(es) · ' + totalEstudiantes + ' estudiantes</span></div>' +
            '<div class="listado-salida">' + bloques + '</div>' +
            '<div class="listado-salida-total">' +
            '<span>Total recaudado <strong class="numero">' + dinero(totalRecaudado) + '</strong></span>' +
            '<span>Total pendiente <strong class="numero">' + dinero(totalPendiente) + '</strong></span>' +
            '</div>';

        var pie = '<span class="texto-apagado nota-pequena">Orden: pagados completos, luego pagos parciales y al final los pendientes. La numeración continúa de bus en bus.</span>' +
            '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cerrar</button></div>';

        modal('Listado de la salida', datos.salida.nombre, contenido, pie, true);
    }

    function recargarSalida(viajeId, mensaje, tipo) {
        return apiGet('salidas', { viaje_id: viajeId }).then(function (respuesta) {
            estado.salida = respuesta.datos;
            pintarModalRedistribucion();
            refrescarFondo();

            if (mensaje) {
                aviso('Distribución actualizada', mensaje, tipo || 'exito');
            }
        }).catch(function (error) {
            aviso('No se pudo actualizar', error.message, 'error');
        });
    }

    function cerrarYVolverAlViaje(viajeId) {
        cerrarModal();

        if (viajeId) {
            abrirModalViaje(viajeId);
        }

        refrescarFondo();
    }

    function abrirModalPaseo(paseoId) {
        // El profesor se elige del catálogo, así que hay que tenerlo cargado.
        if (!estado.profesores) {
            cargarProfesores(false).then(function () {
                abrirModalPaseo(paseoId);
            });
            return;
        }

        var paseo = paseoId ? estado.paseos.filter(function (item) { return item.id === paseoId; })[0] : null;
        var seleccionados = paseo ? paseo.equipo_asistencia.map(function (persona) { return persona.id; }) : [];
        estado.nuevosNombres = [];

        var opciones = estado.personal.map(function (persona) {
            return '<label><input type="checkbox" name="personal" value="' + persona.id + '"' + (seleccionados.indexOf(persona.id) !== -1 ? ' checked' : '') + '>' +
                '<span>' + escapar(persona.nombre) + '</span></label>';
        }).join('');

        // El paseo siempre lleva un profesor a cargo: el nombre sale del catálogo
        // cuando está vinculado y, si todavía no, se conserva el texto guardado.
        var profesorId = paseo ? (paseo.profesor_id || 0) : 0;
        var nombreProfesor = paseo && paseo.profesor_encargado ? paseo.profesor_encargado : '';
        var cargoProfesor = '';

        if (profesorId) {
            var registroProfesor = (estado.profesores || []).filter(function (item) {
                return item.id === profesorId;
            })[0];

            if (registroProfesor) {
                nombreProfesor = registroProfesor.nombre;
                cargoProfesor = registroProfesor.especialidad_cargo || '';
            }
        }

        var vinculado = Boolean(profesorId);
        var textoProfesor = vinculado
            ? nombreProfesor + (cargoProfesor ? ' · ' + cargoProfesor : '')
            : (nombreProfesor ? nombreProfesor + ' · sin vincular' : 'Sin profesor asignado');

        var contenido = '<form class="formulario" id="formulario-paseo"' + (paseo ? ' data-id="' + paseo.id + '"' : '') + '>' +
            '<div class="formulario dos-columnas">' +
            '<div class="campo"><label class="campo-etiqueta" for="paseo-nombre">Nombre del paseo</label>' +
            '<input type="text" class="control" id="paseo-nombre" name="nombre" placeholder="Ej. Paseo a Antiguo Cuscatlán" value="' + escapar(paseo ? paseo.nombre : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="paseo-destino">Destino</label>' +
            '<input type="text" class="control" id="paseo-destino" name="destino" placeholder="Dirección o punto de encuentro" value="' + escapar(paseo ? paseo.destino : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="paseo-costo">Costo por persona</label>' +
            '<input type="number" class="control numero" id="paseo-costo" name="costo_persona" step="0.01" min="0" value="' + (paseo ? paseo.costo_persona : '') + '"></div>' +
            '<div class="campo"><span class="campo-etiqueta">Profesor a cargo</span>' +
            '<input type="hidden" id="paseo-profesor-id" name="profesor_id" value="' + (profesorId || '') + '">' +
            '<input type="hidden" id="paseo-profesor-encargado" name="profesor_encargado" value="' +
            escapar(paseo && !profesorId ? paseo.profesor_encargado : '') + '">' +
            '<div class="campo-selector">' +
            '<span class="campo-selector-valor' + (vinculado || nombreProfesor ? '' : ' sin-valor') + '" id="paseo-profesor-valor">' +
            escapar(textoProfesor) + '</span>' +
            '<span class="campo-selector-acciones">' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="elegir-profesor">' +
            icono(ICONOS.lupa) + (vinculado ? 'Cambiar' : 'Elegir profesor') + '</button>' +
            '</span></div>' +
            '<span class="campo-ayuda">Se busca por nombre, cargo o código en el catálogo de docentes.</span></div>' +
            '</div>' +
            '<div class="campo"><label class="campo-etiqueta" for="paseo-descripcion">Descripción</label>' +
            '<textarea class="control" id="paseo-descripcion" name="descripcion" placeholder="Actividades previstas para el paseo">' + escapar(paseo ? paseo.descripcion || '' : '') + '</textarea></div>' +
            '<div class="campo"><span class="campo-etiqueta">Personal de Asistencia</span>' +
            (estado.personal.length ? '<div class="selector-personal">' + opciones + '</div>' : '<p class="campo-ayuda">Todavía no hay personal registrado. Puedes escribir los nombres abajo.</p>') +
            '<div class="nuevos-nombres"><input type="text" class="control" id="paseo-nuevo-personal" placeholder="Agregar nombre del personal"><button type="button" class="boton boton-borde boton-pequeno" data-accion="agregar-nombre-personal">Agregar</button></div>' +
            '<div class="etiquetas-agregadas" id="etiquetas-personal"></div></div>' +
            '</form>';

        var pie = '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cancelar</button>' +
            '<button type="submit" form="formulario-paseo" class="boton boton-primario">' + icono(ICONOS.cheque) + (paseo ? 'Guardar cambios' : 'Crear paseo') + '</button></div>';

        modal(paseo ? 'Editar paseo' : 'Nuevo paseo', paseo ? paseo.nombre : 'Catálogo de paseos', contenido, pie);
        pintarEtiquetasPersonal();
    }

    function pintarEtiquetasPersonal() {
        var contenedor = $('#etiquetas-personal');

        if (!contenedor) {
            return;
        }

        contenedor.innerHTML = estado.nuevosNombres.map(function (nombre, indice) {
            return '<span class="etiqueta-nombre">' + escapar(nombre) +
                '<button type="button" data-accion="quitar-nombre-personal" data-indice="' + indice + '" aria-label="Quitar">' + icono(ICONOS.cerrar) + '</button></span>';
        }).join('');
    }

    function abrirModalProgramar(paseoId) {
        var paseos = estado.paseos;

        if (!paseos.length) {
            aviso('No hay paseos disponibles', 'Crea un paseo antes de programar un viaje.', 'error');
            return;
        }

            var opciones = paseos.map(function (paseo) {
            return '<option value="' + paseo.id + '"' + (paseo.id === paseoId ? ' selected' : '') + '>' + escapar(paseo.nombre) + ' · ' + escapar(paseo.destino) + '</option>';
        }).join('');

        var contenido = '<form class="formulario" id="formulario-programar">' +
            '<div class="campo"><label class="campo-etiqueta" for="programar-paseo">Paseo</label>' +
            '<select class="control" id="programar-paseo" name="paseo_id">' + opciones + '</select></div>' +
            '<div class="formulario dos-columnas">' +
            '<div class="campo"><label class="campo-etiqueta" for="programar-fecha">Día del viaje</label>' +
            '<input type="date" class="control" id="programar-fecha" name="fecha" value="' + hoyIso() + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="programar-salida">Hora de salida</label>' +
            '<input type="time" class="control" id="programar-salida" name="hora_salida" value="07:00"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="programar-retorno">Hora estimada de regreso</label>' +
            '<input type="time" class="control" id="programar-retorno" name="hora_retorno" value="13:00"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="programar-capacidad">Capacidad máxima del bus</label>' +
            '<input type="number" class="control numero" id="programar-capacidad" name="capacidad_bus" min="' + (estado.parametros.asientos_personal + 1) + '" value="' + estado.parametros.capacidad_bus + '">' +
            '<span class="campo-ayuda">Valor por defecto del sistema, puedes ajustarlo para este viaje.</span></div>' +
            '</div>' +
            '<div class="campo"><label class="campo-etiqueta" for="programar-notas">Notas</label>' +
            '<textarea class="control" id="programar-notas" name="notas" placeholder="Indicaciones para la colecturía"></textarea></div>' +
            '</form>';

        var pie = '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cancelar</button>' +
            '<button type="submit" form="formulario-programar" class="boton boton-primario">Programar viaje</button></div>';

        modal('Programar viaje', 'Nuevo viaje', contenido, pie);
    }

    function abrirModalDetalle(viajeId) {
        apiGet('viajes', { id: viajeId }).then(function (respuesta) {
            var viaje = respuesta.datos;

            var pasajeros = viaje.pasajeros_lista.length ? viaje.pasajeros_lista.map(function (pasajero) {
                return '<tr><td><span class="orden-inscripcion">' + pasajero.orden + '</span></td>' +
                    '<td><span class="celda-principal">' + escapar(pasajero.nombre) + '</span>' +
                    (pasajero.duplicado ? '<span class="pastilla error sin-punto linea">Código repetido</span>' : '') + '</td>' +
                    '<td class="numero celda-codigo">' + escapar(pasajero.codigo) + '</td>' +
                    '<td>' + (pasajero.encargado ? escapar(pasajero.encargado) : '<span class="sin-dato">Sin encargado</span>') + '</td>' +
                    '<td class="columna-media numero">' + dinero(pasajero.costo) + '</td>' +
                    '<td class="columna-media numero">' + dinero(pasajero.pagado) + '</td></tr>';
            }).join('') : '<tr><td colspan="6"><p class="texto-apagado nota-pequena">No se registraron estudiantes en este viaje.</p></td></tr>';

            var contenido = '<dl class="lista-datos con-margen">' +
                '<div><dt>Destino</dt><dd>' + escapar(viaje.destino) + '</dd></div>' +
                '<div><dt>Fecha</dt><dd>' + escapar(fechaCorta(viaje.fecha)) + '</dd></div>' +
                '<div><dt>Horario</dt><dd class="numero">' + escapar(viaje.hora_salida) + ' — ' + escapar(viaje.hora_retorno || '—') + '</dd></div>' +
                '<div><dt>Costo por persona</dt><dd class="numero">' + dinero(viaje.costo_persona) + '</dd></div>' +
                '<div><dt>Estudiantes</dt><dd class="numero">' + viaje.pasajeros + '</dd></div>' +
                '<div><dt>Acompañantes</dt><dd class="numero">' + viaje.acompanantes + '</dd></div>' +
                '<div><dt>Costo esperado</dt><dd class="numero">' + dinero(viaje.esperado) + '</dd></div>' +
                '<div><dt>Recaudado</dt><dd class="numero">' + dinero(viaje.recaudado) + '</dd></div>' +
                '<div><dt>Por cobrar</dt><dd class="numero">' + dinero(viaje.pendiente) + '</dd></div>' +
                '<div><dt>Profesor a cargo</dt><dd>' + escapar(viaje.profesor_encargado) + '</dd></div>' +
                '</dl>' +
                '<div class="tabla-envoltura tabla-media"><table class="tabla tabla-compacta"><thead><tr>' +
                '<th class="col-orden">Orden</th><th>Estudiante</th><th>Código</th><th>Encargado</th><th class="col-derecha">Costo</th><th class="col-derecha">Pagado</th>' +
                '</tr></thead><tbody>' + pasajeros + '</tbody></table></div>';

            modal('Detalle del viaje', viaje.nombre, contenido, '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cerrar</button>' +
                '<button type="button" class="boton boton-primario" data-accion="gestionar-viaje" data-id="' + viaje.id + '">Gestionar viaje</button></div>');
        }).catch(function (error) {
            aviso('No se pudo abrir el detalle', error.message, 'error');
        });
    }

    function confirmar(titulo, mensaje, textoBoton, accion, datos) {
        var atributos = '';

        Object.keys(datos || {}).forEach(function (clave) {
            atributos += ' data-' + clave + '="' + escapar(datos[clave]) + '"';
        });

        modal(titulo, '', '<p class="texto-apagado">' + escapar(mensaje) + '</p>',
            '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cancelar</button>' +
            '<button type="button" class="boton boton-peligro" data-accion="' + accion + '"' + atributos + '>' + escapar(textoBoton) + '</button></div>');
    }

    function confirmarEliminarPaseoConViajes(paseoId, detalles) {
        var paseo = estado.paseos.filter(function (item) {
            return Number(item.id) === paseoId;
        })[0];

        var viajes = Number(detalles.viajes || 0);
        var pasajeros = Number(detalles.pasajeros || 0);
        var pagos = Number(detalles.pagos || 0);

        modal(
            'Eliminar paseo y sus viajes',
            paseo ? paseo.nombre : '',
            '<div class="alerta alerta-error"><strong>Esta acción no se puede deshacer</strong>' +
            '<span>El paseo tiene ' + viajes + (viajes === 1 ? ' viaje programado' : ' viajes programados') +
            ', ' + pasajeros + (pasajeros === 1 ? ' estudiante inscrito' : ' estudiantes inscritos') +
            ' y ' + pagos + (pagos === 1 ? ' pago registrado' : ' pagos registrados') + '.</span></div>' +
            '<p class="texto-apagado">Si continúas se borrarán también esos viajes con sus listas de pasajeros, ' +
            'sus asientos y sus pagos. Los demás paseos y viajes no se modifican.</p>',
            '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cancelar</button>' +
            '<button type="button" class="boton boton-peligro" data-accion="forzar-eliminar-paseo" data-id="' + paseoId + '">Eliminar todo</button></div>'
        );
    }

    function confirmarEliminarViajeConDatos(viajeId, detalles) {
        var viaje = estado.programados.concat(estado.historial).filter(function (item) {
            return Number(item.id) === viajeId;
        })[0];

        var pasajeros = Number(detalles.pasajeros || 0);
        var pagos = Number(detalles.pagos || 0);

        modal(
            'Eliminar viaje con datos',
            viaje ? viaje.nombre + ' · ' + fechaCorta(viaje.fecha) : '',
            '<div class="alerta alerta-error"><strong>Esta acción no se puede deshacer</strong>' +
            '<span>El viaje tiene ' + pasajeros + (pasajeros === 1 ? ' estudiante' : ' estudiantes') +
            ' y ' + pagos + (pagos === 1 ? ' pago registrado' : ' pagos registrados') + '.</span></div>' +
            '<p class="texto-apagado">Si continúas se borrarán también la lista de pasajeros, los asientos ' +
            'y los pagos de este viaje. Los demás viajes no se modifican.</p>',
            '<div class="grupo-botones"><button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cancelar</button>' +
            '<button type="button" class="boton boton-peligro" data-accion="forzar-eliminar-viaje" data-id="' + viajeId + '">Eliminar viaje</button></div>'
        );
    }

    function collectedFormulario(id) {
        var formulario = document.getElementById(id);
        var datos = {};

        if (!formulario) {
            return datos;
        }

        Array.prototype.forEach.call(formulario.elements, function (elemento) {
            if (!elemento.name) {
                return;
            }
            datos[elemento.name] = elemento.type === 'checkbox' ? elemento.checked : elemento.value;
        });

        return datos;
    }

    function recargarDetalleViaje() {
        if (!estado.viajeModalId) {
            return;
        }

        apiGet('viajes', { id: estado.viajeModalId }).then(function (respuesta) {
            estado.viajeModal = respuesta.datos;
            pintarModalViaje();
        });
    }

    function validarFormatoCodigo(campo) {
        var valor = campo.value.trim();
        var contenedor = campo.closest ? campo.closest('.campo') : campo.parentElement;
        var ayuda = contenedor ? contenedor.querySelector('.campo-ayuda') : null;

        if (!ayuda) {
            return;
        }

        if (valor === '') {
            ayuda.textContent = 'Año, sección y número de lista: 2B03';
            ayuda.classList.remove('ayuda-error');
            return;
        }

        if (/^\d{1,2}[A-Za-z]\d{2}$/.test(valor)) {
            ayuda.textContent = 'Código válido: ' + valor.toUpperCase();
            ayuda.classList.remove('ayuda-error');
            return;
        }

        ayuda.textContent = 'Formato inválido. Ejemplo: 2B03';
        ayuda.classList.add('ayuda-error');
    }

    function alternarEncargado(activo) {
        var campo = $('#campo-encargado');
        var aviso = $('#aviso-encargado');

        if (campo) {
            campo.classList.toggle('oculto', !activo);
        }

        if (aviso) {
            aviso.classList.toggle('oculto', !activo);
        }
    }

    function guardarMapaActual() {
        if (!estado.mapa) {
            return;
        }

        estado.historialAsientos.push(estado.mapa.ocupantes.map(function (ocupante) {
            return {
                pasajero_id: ocupante.pasajero_id,
                rol: ocupante.tipo,
                numero: ocupante.numero
            };
        }));

        if (estado.historialAsientos.length > 10) {
            estado.historialAsientos.shift();
        }
    }

    function moverAsiento(pasajeroId, rol, destino, mensaje) {
        var viaje = estado.viajeDetalle;

        if (!viaje) {
            return;
        }

        var seleccionado = ocupanteSeleccionado();
        var nombre = seleccionado ? seleccionado.nombre : 'El estudiante';

        guardarMapaActual();

        apiPost('asientos', {
            viaje_id: viaje.id,
            pasajero_id: pasajeroId,
            rol: rol,
            destino: destino
        }, 'mover').then(function (respuesta) {
            estado.mapa = respuesta.datos.mapa;
            estado.viajeDetalle = respuesta.datos.viaje;
            estado.asientoSeleccionado = null;
            render();
            aviso('Ubicación actualizada', mensaje || (nombre + ' ahora se sienta en el asiento ' + destino + '.'), 'exito');
        }).catch(function (error) {
            estado.historialAsientos.pop();
            aviso('No se pudo mover', error.message, 'error');
        });
    }

    function deshacerMovimiento() {
        var viaje = estado.viajeDetalle;

        if (!viaje || !estado.historialAsientos.length) {
            return;
        }

        var anterior = estado.historialAsientos.pop();

        apiPost('asientos', {
            viaje_id: viaje.id,
            asientos: anterior
        }, 'restaurar').then(function (respuesta) {
            estado.mapa = respuesta.datos.mapa;
            estado.viajeDetalle = respuesta.datos.viaje;
            estado.asientoSeleccionado = null;
            render();
            aviso('Movimiento deshecho', 'Se restauró la distribución anterior.', 'exito');
        }).catch(function (error) {
            aviso('No se pudo deshacer', error.message, 'error');
        });
    }

    function actualizarDetallePago() {
        var seleccion = $('#pago-pasajero');
        var monto = $('#pago-monto');
        var detalle = $('#pago-detalle');

        if (!seleccion || !monto) {
            return;
        }

        var opcion = seleccion.options[seleccion.selectedIndex];

        if (!opcion || !opcion.value) {
            monto.value = '';
            if (detalle) {
                detalle.textContent = 'El pago se registra a nombre del viaje.';
            }
            return;
        }

        var costo = parseFloat(opcion.getAttribute('data-costo') || '0');
        var pendiente = parseFloat(opcion.getAttribute('data-pendiente') || '0');
        var conEncargado = opcion.getAttribute('data-encargado') === '1';

        if (pendiente > 0) {
            monto.value = pendiente.toFixed(2);
        } else {
            monto.value = '';
        }

        if (detalle) {
            if (pendiente <= 0 && costo > 0) {
                detalle.textContent = 'Este estudiante ya tiene cubierto su costo de ' + dinero(costo) + '.';
            } else if (conEncargado) {
                detalle.textContent = 'Incluye el costo del estudiante y de su encargado: ' + dinero(costo) + '.';
            } else {
                detalle.textContent = 'Costo del estudiante: ' + dinero(costo) + '.';
            }
        }
    }

    function manejarAcciones(evento) {
        // Un clic fuera de la lista de resultados la cierra.
        if (evento.target && evento.target.closest
            && !evento.target.closest('.autocompletar, #pasajero-codigo, #pasajero-companero')) {
            cerrarSugerencias();
        }

        var disparador = evento.target.closest('[data-accion]');

        if (!disparador) {
            return;
        }

        var accion = disparador.getAttribute('data-accion');
        var id = disparador.getAttribute('data-id');
        var estadoViaje = disparador.getAttribute('data-estado');

        switch (accion) {
            case 'recargar':
                cargarPanel('Actualizando la información de la colecturía');
                break;

            case 'elegir-profesor':
                abrirSelectorProfesor();
                break;

            case 'seleccionar-profesor':
                elegirProfesor(
                    Number(id || 0),
                    disparador.getAttribute('data-nombre') || '',
                    disparador.getAttribute('data-meta') || ''
                );
                break;

            case 'cerrar-selector':
                cerrarSelector();
                break;

            case 'elegir-sugerencia':
                var tipoSugerencia = disparador.getAttribute('data-tipo');

                if (tipoSugerencia === 'companero') {
                    agregarCompanero(disparador.getAttribute('data-codigo'));
                } else {
                    elegirAlumnoSugerido({
                        id: disparador.getAttribute('data-id'),
                        codigo: disparador.getAttribute('data-codigo'),
                        nombre: disparador.getAttribute('data-nombre'),
                        encargado: disparador.getAttribute('data-encargado'),
                        seccion: disparador.getAttribute('data-seccion')
                    });
                }
                break;

            case 'quitar-companero':
                quitarCompanero(disparador.getAttribute('data-codigo'));
                break;

            case 'cambiar-periodo':
                var periodoElegido = disparador.getAttribute('data-periodo');

                if (periodoElegido && periodoElegido !== estado.periodo) {
                    estado.periodo = periodoElegido;
                    cargarEstadisticas(true);
                }
                break;

            case 'recargar-estadisticas':
                cargarEstadisticas(true);
                break;

            case 'ir-estadisticas':
                cambiarVista('estadisticas');
                break;

            case 'ir-administracion':
                cambiarVista('administracion');
                break;

            case 'gestionar-viaje':
                abrirModalViaje(Number(id));
                break;

            case 'abrir-alta':
                abrirModalViaje(Number(id), true);
                break;

            case 'cobrar-pasajero':
                estado.enfocarCobro = Number(id);
                abrirModalViaje(viajeIdActual(), false);
                break;

            case 'cobrar-todos':
                confirmar(
                    'Cobrar lo pendiente',
                    'Se registrará un pago por cada estudiante que aún no ha pagado lo que le corresponde, incluyendo el costo de sus acompañantes. Los pagos ya realizados no se tocan.',
                    'Registrar cobros',
                    'confirmar-cobrar-todos',
                    { id: viajeIdActual() }
                );
                break;

            case 'confirmar-cobrar-todos':
                apiPost('pagos', { viaje_id: Number(id) }, 'cobrar_pendientes').then(function (respuesta) {
                    cerrarModal();
                    aviso('Cobros registrados', respuesta.mensaje || 'Se registraron los cobros pendientes.', 'exito');
                    cargarPanel();
                }).catch(function (error) {
                    aviso('No se pudieron registrar', error.message, 'error');
                });
                break;

            case 'ver-viaje':
                abrirModalDetalle(Number(id));
                break;

            case 'cerrar-modal':
                cerrarModal();
                break;

            case 'nuevo-paseo':
                abrirModalPaseo(null);
                break;

            case 'editar-paseo':
                abrirModalPaseo(Number(id));
                break;

            case 'programar-viaje':
                abrirModalProgramar(id ? Number(id) : null);
                break;

            case 'eliminar-paseo':
                confirmar(
                    'Eliminar paseo',
                    'Se quitará el paseo del catálogo. Si tiene viajes programados, se pedirá una segunda confirmación antes de borrarlos.',
                    'Continuar',
                    'confirmar-eliminar-paseo',
                    { id: Number(id) }
                );
                break;

            case 'confirmar-eliminar-paseo':
                apiPost('paseos', {}, 'eliminar', { id: Number(id) }).then(function (respuesta) {
                    estado.paseos = respuesta.datos;
                    cerrarModal();
                    refrescarFondo();
                    aviso('Paseo eliminado', respuesta.mensaje || 'El paseo se retiró del catálogo.', 'exito');
                }).catch(function (error) {
                    if (error.codigo === 'paseo_en_uso') {
                        confirmarEliminarPaseoConViajes(Number(id), error.detalles || {});
                        return;
                    }

                    aviso('No se pudo eliminar', error.message, 'error');
                });
                break;

            case 'forzar-eliminar-paseo':
                apiPost('paseos', { forzar: true }, 'eliminar', { id: Number(id) }).then(function (respuesta) {
                    estado.paseos = respuesta.datos;
                    cerrarModal();
                    refrescarFondo();
                    aviso('Paseo eliminado', respuesta.mensaje || 'El paseo y sus viajes se retiraron del sistema.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo eliminar', error.message, 'error');
                });
                break;

            case 'eliminar-viaje':
                confirmar(
                    'Eliminar viaje',
                    'Se borrará el viaje. Si ya tiene estudiantes o pagos, se pedirá una segunda confirmación.',
                    'Continuar',
                    'confirmar-eliminar-viaje',
                    { id: Number(id) }
                );
                break;

            case 'confirmar-eliminar-viaje':
                apiPost('viajes', {}, 'eliminar', { id: Number(id) }).then(function () {
                    aviso('Viaje eliminado', 'El viaje se retiró del sistema.', 'exito');
                    cerrarModal();
                    cargarPanel();
                }).catch(function (error) {
                    if (error.codigo === 'viaje_con_datos') {
                        confirmarEliminarViajeConDatos(Number(id), error.detalles || {});
                        return;
                    }

                    aviso('No se pudo eliminar', error.message, 'error');
                });
                break;

            case 'forzar-eliminar-viaje':
                apiPost('viajes', { forzar: true }, 'eliminar', { id: Number(id) }).then(function () {
                    aviso('Viaje eliminado', 'Se retiró el viaje con sus pasajeros, asientos y pagos.', 'exito');
                    cerrarModal();
                    cargarPanel();
                }).catch(function (error) {
                    aviso('No se pudo eliminar', error.message, 'error');
                });
                break;

            case 'eliminar-personal':
                apiPost('personal', {}, 'eliminar', { id: Number(id) }).then(function (respuesta) {
                    estado.personal = respuesta.datos;
                    render();
                    aviso('Personal eliminado', 'El registro se retiró de la lista.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo eliminar', error.message, 'error');
                });
                break;

            case 'agregar-personal':
                var nombrePersonal = $('#nuevo-personal').value.trim();

                if (!nombrePersonal) {
                    aviso('Falta el nombre', 'Escribe el nombre del personal de asistencia.', 'error');
                    return;
                }

                apiPost('personal', { nombre: nombrePersonal }).then(function (respuesta) {
                    estado.personal = respuesta.datos;
                    render();
                    aviso('Personal agregado', nombrePersonal + ' se añadió a la lista.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo agregar', error.message, 'error');
                });
                break;

            case 'agregar-nombre-personal':
                var campoNombre = $('#paseo-nuevo-personal');

                if (!campoNombre || !campoNombre.value.trim()) {
                    return;
                }

                estado.nuevosNombres.push(campoNombre.value.trim());
                campoNombre.value = '';
                pintarEtiquetasPersonal();
                break;

            case 'quitar-nombre-personal':
                estado.nuevosNombres.splice(Number(disparador.getAttribute('data-indice')), 1);
                pintarEtiquetasPersonal();
                break;

            case 'guardar-capacidad':
                var capacidad = $('#parametro-capacidad').value;

                apiPost('parametros', { clave: 'capacidad_bus', valor: capacidad }).then(function (respuesta) {
                    estado.parametros = respuesta.datos;
                    render();
                    aviso('Parámetro actualizado', 'La capacidad predeterminada es ' + respuesta.datos.capacidad_bus + ' asientos.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo guardar', error.message, 'error');
                });
                break;

            case 'guardar-personal':
                var asientosPersonal = $('#parametro-personal').value;

                apiPost('parametros', { clave: 'asientos_personal', valor: asientosPersonal }).then(function (respuesta) {
                    estado.parametros = respuesta.datos;
                    render();
                    aviso('Parámetro actualizado', 'Se reservan ' + respuesta.datos.asientos_personal + ' asientos para el personal.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo guardar', error.message, 'error');
                });
                break;

            case 'quitar-pasajero':
                apiPost('pasajeros', {}, 'eliminar', { id: Number(id) }).then(function (respuesta) {
                    if (estado.viajeModalId) {
                        estado.viajeModal = respuesta.datos;
                        pintarModalViaje();
                    } else {
                        estado.viajeDetalle = respuesta.datos;
                        render();
                    }
                    aviso('Pasajero retirado', 'El estudiante se quitó de la lista del viaje.', 'exito');
                    refrescarFondo();
                }).catch(function (error) {
                    aviso('No se pudo retirar', error.message, 'error');
                });
                break;

            case 'anular-pago':
                apiPost('pagos', {}, 'eliminar', { id: Number(id) }).then(function (respuesta) {
                    estado.viajeModal = respuesta.datos;
                    pintarModalViaje();
                    aviso('Pago anulado', 'El movimiento se eliminó del registro.', 'exito');
                    refrescarFondo();
                }).catch(function (error) {
                    aviso('No se pudo anular', error.message, 'error');
                });
                break;

            case 'cobrar-pendientes':
                apiPost('pagos', { viaje_id: estado.viajeModalId }, 'cobrar_pendientes').then(function (respuesta) {
                    estado.viajeModal = respuesta.datos;
                    pintarModalViaje();
                    aviso('Cobros registrados', respuesta.mensaje || 'Se registraron los cobros pendientes.', 'exito');
                    refrescarFondo();
                }).catch(function (error) {
                    aviso('No se pudieron registrar', error.message, 'error');
                });
                break;

            case 'cerrar-boletos':
                var viajeBoletos = Number(id) || estado.viajeModalId;

                apiPost('viajes', {}, 'cerrar_boletos', { id: viajeBoletos }).then(function (respuesta) {
                    if (estado.viajeModalId) {
                        estado.viajeModal = respuesta.datos;
                        pintarModalViaje();
                    }

                    aviso('Boletos cerrados', 'Ya no se pueden inscribir más estudiantes. El listado quedó disponible.', 'exito');
                    refrescarFondo();
                }).catch(function (error) {
                    aviso('No se pudieron cerrar los boletos', error.message, 'error');
                });
                break;

            case 'generar-listado':
                apiPost('asientos', { viaje_id: estado.viajeDetalle.id }, 'generar').then(function (respuesta) {
                    estado.mapa = respuesta.datos.mapa;
                    estado.viajeDetalle = respuesta.datos.viaje;
                    estado.asientoSeleccionado = null;
                    render();
                    aviso('Listado generado', 'Los compañeros de viaje quedaron sentados juntos.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo generar', error.message, 'error');
                });
                break;

            case 'compactar-asientos':
                apiPost('asientos', { viaje_id: estado.viajeDetalle.id }, 'compactar').then(function (respuesta) {
                    estado.mapa = respuesta.datos.mapa;
                    estado.viajeDetalle = respuesta.datos.viaje;
                    render();
                    aviso('Asientos compactados', 'Los asientos vacíos intermedios se rellenaron.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo compactar', error.message, 'error');
                });
                break;

            case 'cancelar-seleccion':
                estado.asientoSeleccionado = null;
                render();
                break;

            case 'deshacer-movimiento':
                deshacerMovimiento();
                break;

            case 'seleccionar-asiento':
                var pasajeroId = Number(disparador.getAttribute('data-pasajero-id'));
                var rolSeleccion = disparador.getAttribute('data-rol') || 'estudiante';
                var yaSeleccionado = estado.asientoSeleccionado
                    && estado.asientoSeleccionado.pasajero_id === pasajeroId
                    && estado.asientoSeleccionado.tipo === rolSeleccion;

                estado.asientoSeleccionado = yaSeleccionado ? null : { pasajero_id: pasajeroId, tipo: rolSeleccion };
                render();
                break;

            case 'soltar-en-asiento':
                var destino = Number(disparador.getAttribute('data-asiento'));
                var origen = Number(disparador.getAttribute('data-pasajero-id'));
                var rolOrigen = disparador.getAttribute('data-rol') || 'estudiante';
                moverAsiento(origen, rolOrigen, destino);
                break;

            case 'forzar-pasajero':
                var formulario = collectedFormulario('formulario-pasajero');

                apiPost('pasajeros', {
                    viaje_id: estado.viajeModalId,
                    nombre: formulario.nombre,
                    codigo: formulario.codigo,
                    encargado: formulario.encargado,
                    alumno_id: formulario.alumno_id,
                    companeros: estado.formPasajero.companeros || [],
                    forzar: true
                }).then(function (respuesta) {
                    estado.viajeModal = respuesta.datos;
                    estado.advertenciaCodigo = null;
                    estado.formPasajero = formPasajeroVacio();
                    pintarModalViaje();
                    aviso('Estudiante agregado', 'Se registró con el código repetido.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo agregar', error.message, 'error');
                });
                break;

            case 'descartar-advertencia':
                estado.advertenciaCodigo = null;
                pintarModalViaje();
                break;

            case 'abrir-redistribucion':
                abrirModalRedistribucion(Number(id));
                break;

            case 'desborde-crear-bus':
                var pendiente = estado.desborde;

                if (!pendiente) {
                    cerrarModal();
                    return;
                }

                var viajeOrigen = estado.viajeModalId || pendiente.viaje_id;

                apiPost('pasajeros', {
                    viaje_id: pendiente.viaje_id,
                    nombre: pendiente.nombre,
                    codigo: pendiente.codigo,
                    encargado: pendiente.encargado,
                    alumno_id: pendiente.alumno_id,
                    companeros: pendiente.companeros || [],
                    desborde: 'auto'
                }).then(function (respuesta) {
                    estado.formPasajero = formPasajeroVacio();
                    cerrarYVolverAlViaje(viajeOrigen);
                    aviso('Bus adicional creado', respuesta.mensaje || 'El estudiante quedó en el bus nuevo.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo crear el bus', error.message, 'error');
                });
                break;

            case 'desborde-mover':
                var pendienteMovimiento = estado.desborde;
                var destinoDesborde = $('#desborde-destino');

                if (!pendienteMovimiento || !destinoDesborde || !destinoDesborde.value) {
                    aviso('Elige un bus', 'Selecciona el bus donde quieres acomodar a la persona.', 'error');
                    return;
                }

                var viajeDestinoDesborde = Number(destinoDesborde.value);
                var viajeRegresion = estado.viajeModalId;

                apiPost('pasajeros', {
                    viaje_id: pendienteMovimiento.viaje_id,
                    nombre: pendienteMovimiento.nombre,
                    codigo: pendienteMovimiento.codigo,
                    encargado: pendienteMovimiento.encargado,
                    alumno_id: pendienteMovimiento.alumno_id,
                    companeros: pendienteMovimiento.companeros || [],
                    viaje_destino: viajeDestinoDesborde
                }).then(function (respuesta) {
                    estado.formPasajero = formPasajeroVacio();
                    cerrarYVolverAlViaje(viajeRegresion);
                    aviso('Estudiante reasignado', respuesta.mensaje || 'El estudiante quedó en el bus de destino.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo reasignar', error.message, 'error');
                });
                break;

            case 'desborde-ampliar':
                var pendienteAmpliar = estado.desborde;
                var campoCapacidad = $('#desborde-capacidad');

                if (!pendienteAmpliar || !campoCapacidad) {
                    return;
                }

                var nuevaCapacidad = Number(campoCapacidad.value);
                var viajeAmpliado = estado.viajeModal || {};
                var viajeRegresionAmpliar = estado.viajeModalId;

                apiPost('viajes', {
                    capacidad_bus: nuevaCapacidad,
                    fecha: viajeAmpliado.fecha,
                    hora_salida: viajeAmpliado.hora_salida,
                    hora_retorno: viajeAmpliado.hora_retorno || '',
                    notas: viajeAmpliado.notas || ''
                }, 'actualizar', { id: pendienteAmpliar.viaje_id }).then(function () {
                    return apiPost('pasajeros', {
                        viaje_id: pendienteAmpliar.viaje_id,
                        nombre: pendienteAmpliar.nombre,
                        codigo: pendienteAmpliar.codigo,
                        encargado: pendienteAmpliar.encargado,
                        alumno_id: pendienteAmpliar.alumno_id,
                        companeros: pendienteAmpliar.companeros || []
                    });
                }).then(function (respuesta) {
                    estado.formPasajero = formPasajeroVacio();
                    cerrarYVolverAlViaje(viajeRegresionAmpliar);
                    aviso('Bus ampliado', respuesta.mensaje || 'El estudiante se agregó al viaje.', 'exito');
                }).catch(function (error) {
                    aviso('No se pudo ampliar el bus', error.message, 'error');
                });
                break;

            case 'redistribucion-mover':
                var seleccion = $$('input[name="pasajeros[]"]:checked').map(function (elemento) {
                    return Number(elemento.value);
                });
                var campoDestino = $('#redistribucion-destino');

                if (seleccion.length === 0) {
                    aviso('Selecciona estudiantes', 'Marca al menos un estudiante para cambiarlo de bus.', 'error');
                    return;
                }

                if (!campoDestino || !campoDestino.value) {
                    aviso('Elige un bus', 'Selecciona el bus de destino.', 'error');
                    return;
                }

                apiPost('pasajeros', {
                    pasajeros: seleccion,
                    viaje_destino: Number(campoDestino.value)
                }, 'mover').then(function (respuesta) {
                    var referencia = estado.salida && estado.salida.buses.length ? estado.salida.buses[0].id : 0;
                    recargarSalida(referencia, respuesta.mensaje);
                }).catch(function (error) {
                    aviso('No se pudo mover', error.message, 'error');
                });
                break;

            case 'redistribucion-repartir':
                var busReferencia = estado.salida && estado.salida.buses.length ? estado.salida.buses[0].id : 0;

                apiPost('viajes', { viaje_id: busReferencia }, 'rebalancear').then(function (respuesta) {
                    recargarSalida(busReferencia, respuesta.mensaje);
                }).catch(function (error) {
                    aviso('No se pudo repartir', error.message, 'error');
                });
                break;

            case 'cambiar-estado':
                var viajeCambioId = Number(id) || estado.viajeModalId;

                apiPost('viajes', { estado: estadoViaje }, 'estado', { id: viajeCambioId }).then(function (respuesta) {
                    if (estadoViaje === 'programado') {
                        delete viajesAutoCerrados[viajeCambioId];
                    }

                    if (estado.viajeModalId) {
                        estado.viajeModal = respuesta.datos;
                        pintarModalViaje();
                    }

                    aviso('Estado actualizado', 'El viaje quedó como ' + (estadoViaje === 'finalizado' ? 'finalizado' : 'programado') + '.', 'exito');
                    refrescarFondo();
                }).catch(function (error) {
                    aviso('No se pudo cambiar el estado', error.message, 'error');
                });
                break;

            case 'generar-listado-salida':
                var viajeListado = Number(id);

                apiGet('salidas', { viaje_id: viajeListado }).then(function (respuesta) {
                    pintarListadoSalida(respuesta.datos);
                }).catch(function (error) {
                    aviso('No se pudo generar el listado', error.message, 'error');
                });
                break;

            case 'recargar-alumnos':
                cargarPadron(true);
                break;

            case 'recargar-profesores':
                cargarProfesores(true);
                break;

            case 'ir-administracion':
                cambiarVista('administracion');
                break;

            case 'nuevo-alumno':
                abrirModalAlumno(null);
                break;

            case 'editar-alumno':
                abrirModalAlumno(Number(id));
                break;

            case 'eliminar-alumno':
                confirmar(
                    'Eliminar alumno del padrón',
                    'El alumno se quitará del padrón y de su sección. Si ya participó en un viaje no se podrá borrar: en ese caso márcalo como inactivo.',
                    'Eliminar',
                    'confirmar-eliminar-alumno',
                    { id: Number(id) }
                );
                break;

            case 'confirmar-eliminar-alumno':
                apiPost('alumnos', {}, 'eliminar', { id: Number(id) }).then(function (respuesta) {
                    aplicarPadron(respuesta.datos);
                    cerrarModal();
                    render();
                    aviso('Alumno eliminado', respuesta.mensaje || 'El alumno salió del padrón.', 'exito');
                }).catch(function (error) {
                    cerrarModal();
                    aviso('No se pudo eliminar', error.message, 'error');
                });
                break;

            case 'nueva-seccion':
                abrirModalSeccion(null);
                break;

            case 'editar-seccion':
                abrirModalSeccion(Number(id));
                break;

            case 'eliminar-seccion':
                confirmar(
                    'Eliminar sección',
                    'La sección solo se puede eliminar cuando no tiene alumnos inscritos.',
                    'Eliminar',
                    'confirmar-eliminar-seccion',
                    { id: Number(id) }
                );
                break;

            case 'confirmar-eliminar-seccion':
                apiPost('secciones', {}, 'eliminar', { id: Number(id) }).then(function (respuesta) {
                    aplicarPadron(respuesta.datos);
                    cerrarModal();
                    render();
                    aviso('Sección eliminada', respuesta.mensaje || 'La sección salió del catálogo.', 'exito');
                }).catch(function (error) {
                    cerrarModal();
                    aviso('No se pudo eliminar', error.message, 'error');
                });
                break;

            case 'nuevo-profesor':
                abrirModalProfesor(null);
                break;

            case 'editar-profesor':
                abrirModalProfesor(Number(id));
                break;

            case 'eliminar-profesor':
                confirmar(
                    'Eliminar profesor',
                    'El profesor se quitará del catálogo. Si tiene paseos asignados no se podrá borrar: en ese caso márcalo como inactivo.',
                    'Eliminar',
                    'confirmar-eliminar-profesor',
                    { id: Number(id) }
                );
                break;

            case 'confirmar-eliminar-profesor':
                apiPost('profesores', {}, 'eliminar', { id: Number(id) }).then(function (respuesta) {
                    estado.profesores = respuesta.datos;
                    cerrarModal();
                    render();
                    aviso('Profesor eliminado', respuesta.mensaje || 'El profesor salió del catálogo.', 'exito');
                }).catch(function (error) {
                    cerrarModal();
                    aviso('No se pudo eliminar', error.message, 'error');
                });
                break;

            default:
                break;
        }
    }

    function manejarEnvios(evento) {
        var formulario = evento.target;

        if (!formulario.id) {
            return;
        }

        evento.preventDefault();

        if (formulario.id === 'formulario-paseo') {
            var datosPaseo = collectedFormulario('formulario-paseo');
            var seleccionados = $$('input[name="personal"]:checked', formulario).map(function (elemento) {
                return Number(elemento.value);
            });

            datosPaseo.profesor_id = Number(datosPaseo.profesor_id || 0);
            datosPaseo.personal_ids = seleccionados;
            datosPaseo.personal = estado.nuevosNombres;

            var idPaseo = formulario.getAttribute('data-id');
            var peticion = idPaseo
                ? apiPost('paseos', datosPaseo, 'actualizar', { id: Number(idPaseo) })
                : apiPost('paseos', datosPaseo);

            peticion.then(function () {
                return apiGet('paseos');
            }).then(function (respuesta) {
                estado.paseos = respuesta.datos;
                render();
                cerrarModal();
                aviso(idPaseo ? 'Paseo actualizado' : 'Paseo creado', 'Los cambios quedaron guardados.', 'exito');
                refrescarFondo();
            }).catch(function (error) {
                aviso('No se pudo guardar', error.message, 'error');
            });

            return;
        }

        if (formulario.id === 'formulario-programar') {
            var datosViaje = collectedFormulario('formulario-programar');

            apiPost('viajes', datosViaje).then(function (respuesta) {
                cerrarModal();
                aviso('Viaje programado', 'El viaje ya aparece en la pestaña Inicio.', 'exito');
                cargarPanel();
            }).catch(function (error) {
                aviso('No se pudo programar', error.message, 'error');
            });

            return;
        }

        if (formulario.id === 'formulario-viaje') {
            var datos = collectedFormulario('formulario-viaje');

            apiPost('viajes', datos, 'actualizar', { id: estado.viajeModalId }).then(function (respuesta) {
                estado.viajeModal = respuesta.datos;
                estado.viajeDetalle = respuesta.datos;
                pintarModalViaje();
                aviso('Viaje actualizado', 'Los datos del viaje quedaron guardados.', 'exito');
                refrescarFondo();
            }).catch(function (error) {
                aviso('No se pudo guardar', error.message, 'error');
            });

            return;
        }

        if (formulario.id === 'formulario-pasajero') {
            var datosPasajero = collectedFormulario('formulario-pasajero');
            var companerosPasajero = (estado.formPasajero.companeros || []).slice();

            estado.formPasajero.nombre = datosPasajero.nombre || '';
            estado.formPasajero.codigo = datosPasajero.codigo || '';
            estado.formPasajero.encargado = datosPasajero.encargado || '';
            estado.formPasajero.alumnoId = Number(datosPasajero.alumno_id || 0) || null;

            apiPost('pasajeros', {
                viaje_id: estado.viajeModalId,
                nombre: datosPasajero.nombre || '',
                codigo: datosPasajero.codigo || '',
                encargado: datosPasajero.encargado || '',
                alumno_id: estado.formPasajero.alumnoId,
                companeros: companerosPasajero
            }).then(function (respuesta) {
                estado.viajeModal = respuesta.datos;
                estado.advertenciaCodigo = null;
                estado.formPasajero = formPasajeroVacio();
                pintarModalViaje();
                aviso('Estudiante agregado', 'El pasajero se añadió a la lista del viaje.', 'exito');
                refrescarFondo();

                var codigoCampo = $('#pasajero-codigo');

                if (codigoCampo) {
                    codigoCampo.focus();
                }
            }).catch(function (error) {
                if (error.codigo === 'codigo_repetido') {
                    estado.advertenciaCodigo = error.detalles;
                    pintarModalViaje();
                    var campo = $('#pasajero-codigo');
                    if (campo) {
                        campo.focus();
                    }
                    return;
                }

                if (error.codigo === 'sin_cupos') {
                    abrirModalDesborde({
                        viaje_id: estado.viajeModalId,
                        nombre: datosPasajero.nombre || '',
                        codigo: datosPasajero.codigo || '',
                        encargado: datosPasajero.encargado || '',
                        alumno_id: estado.formPasajero.alumnoId,
                        companeros: companerosPasajero,
                        detalles: error.detalles || {}
                    });
                    return;
                }

                aviso('No se pudo agregar', error.message, 'error');
            });

            return;
        }

        if (formulario.id === 'formulario-nuevo-bus') {
            var datosBus = collectedFormulario('formulario-nuevo-bus');
            var busReferencia = estado.salida && estado.salida.buses.length ? estado.salida.buses[0].id : 0;

            apiPost('viajes', {
                viaje_id: busReferencia,
                capacidad_bus: datosBus.capacidad_bus,
                fecha: datosBus.fecha,
                hora_salida: datosBus.hora_salida,
                hora_retorno: datosBus.hora_retorno
            }, 'crear_bus').then(function (respuesta) {
                recargarSalida(busReferencia, respuesta.mensaje);
            }).catch(function (error) {
                aviso('No se pudo crear el bus', error.message, 'error');
            });

            return;
        }

        if (formulario.id === 'formulario-pago') {
            var datosPago = collectedFormulario('formulario-pago');

            apiPost('pagos', {
                viaje_id: estado.viajeModalId,
                pasajero_id: datosPago.pasajero_id,
                monto: datosPago.monto,
                metodo: datosPago.metodo,
                nota: datosPago.nota
            }).then(function (respuesta) {
                estado.viajeModal = respuesta.datos;
                pintarModalViaje();
                aviso('Pago registrado', 'El monto se sumó al recaudado del viaje.', 'exito');
                refrescarFondo();
            }).catch(function (error) {
                aviso('No se pudo registrar', error.message, 'error');
            });
        }

        if (formulario.id === 'formulario-alumno') {
            var datosAlumno = collectedFormulario('formulario-alumno');
            var idAlumno = formulario.getAttribute('data-id');

            datosAlumno.seccion_id = Number(datosAlumno.seccion_id || 0);

            var peticionAlumno = idAlumno
                ? apiPost('alumnos', datosAlumno, 'actualizar', { id: Number(idAlumno) })
                : apiPost('alumnos', datosAlumno);

            peticionAlumno.then(function (respuesta) {
                aplicarPadron(respuesta.datos);
                cerrarModal();
                render();
                aviso('Padrón actualizado', respuesta.mensaje || 'Los datos del alumno quedaron guardados.', 'exito');
            }).catch(function (error) {
                aviso('No se pudo guardar', error.message, 'error');
            });
        }

        if (formulario.id === 'formulario-profesor') {
            var datosProfesor = collectedFormulario('formulario-profesor');
            var idProfesor = formulario.getAttribute('data-id');

            var peticionProfesor = idProfesor
                ? apiPost('profesores', datosProfesor, 'actualizar', { id: Number(idProfesor) })
                : apiPost('profesores', datosProfesor);

            peticionProfesor.then(function (respuesta) {
                estado.profesores = respuesta.datos;
                cerrarModal();
                render();
                aviso('Profesor guardado', respuesta.mensaje || 'Los datos del profesor quedaron guardados.', 'exito');
            }).catch(function (error) {
                aviso('No se pudo guardar', error.message, 'error');
            });
        }

        if (formulario.id === 'formulario-seccion') {
            var datosSeccion = collectedFormulario('formulario-seccion');
            var idSeccion = formulario.getAttribute('data-id');

            var peticionSeccion = idSeccion
                ? apiPost('secciones', datosSeccion, 'actualizar', { id: Number(idSeccion) })
                : apiPost('secciones', datosSeccion);

            peticionSeccion.then(function (respuesta) {
                aplicarPadron(respuesta.datos);
                cerrarModal();
                render();
                aviso('Sección guardada', respuesta.mensaje || 'La sección quedó registrada.', 'exito');
            }).catch(function (error) {
                aviso('No se pudo guardar', error.message, 'error');
            });
        }
    }

    function cambiarVista(vista) {
        estado.vista = vista;

        Array.prototype.forEach.call($$('.pestana'), function (pestana) {
            var activa = pestana.getAttribute('data-vista') === vista;
            pestana.classList.toggle('activa', activa);
            pestana.setAttribute('aria-selected', activa ? 'true' : 'false');
        });

        if (vista === 'estadisticas') {
            cargarEstadisticas(false);
        }

        if (vista === 'alumnos') {
            cargarPadron(false);
        }

        if (vista === 'profesores') {
            cargarProfesores(false);
        }

        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function iniciar() {
        var hoy = new Date();
        $('#fecha-hoy').textContent = hoy.toLocaleDateString(localeFechas(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        $('#pestanas').addEventListener('click', function (evento) {
            var pestana = evento.target.closest('.pestana');

            if (pestana) {
                cambiarVista(pestana.getAttribute('data-vista'));
            }
        });

        // Al cambiar el idioma se repintan las fechas y la vista actual.
        document.addEventListener('cambio-idioma', function () {
            marcarFechaEnVivo();
            render();
        });

        document.addEventListener('click', manejarAcciones);

        document.addEventListener('submit', manejarEnvios);

        document.addEventListener('input', function (evento) {
            if (evento.target.id === 'busqueda-pasajeros') {
                estado.busquedaPasajeros = evento.target.value;
                var posicion = evento.target.selectionStart;
                render();
                var campo = $('#busqueda-pasajeros');
                if (campo) {
                    campo.focus();
                    campo.setSelectionRange(posicion, posicion);
                }
            }

            if (evento.target.id === 'busqueda-paseos') {
                estado.filtroPaseos = evento.target.value;
                var cursor = evento.target.selectionStart;
                render();
                var entrada = $('#busqueda-paseos');
                if (entrada) {
                    entrada.focus();
                    entrada.setSelectionRange(cursor, cursor);
                }
            }

            if (evento.target.id === 'busqueda-alumnos') {
                estado.filtroAlumnos.q = evento.target.value;
                var posicionAlumnos = evento.target.selectionStart;
                render();
                var campoAlumnos = $('#busqueda-alumnos');
                if (campoAlumnos) {
                    campoAlumnos.focus();
                    campoAlumnos.setSelectionRange(posicionAlumnos, posicionAlumnos);
                }
            }

            if (evento.target.id === 'busqueda-profesores') {
                estado.busquedaProfesores = evento.target.value;
                var posicionProfesores = evento.target.selectionStart;
                render();
                var campoProfesores = $('#busqueda-profesores');
                if (campoProfesores) {
                    campoProfesores.focus();
                    campoProfesores.setSelectionRange(posicionProfesores, posicionProfesores);
                }
            }

            if (evento.target.id === 'busqueda-profesor') {
                if (estado.selectorProfesor) {
                    estado.selectorProfesor.busqueda = evento.target.value;
                    pintarListaProfesores();
                }
            }

            if (evento.target.id === 'pasajero-codigo') {
                var codigoEscrito = normalizarCodigoCliente(evento.target.value);

                estado.formPasajero.codigo = evento.target.value;
                validarFormatoCodigo(evento.target);

                // Si el código dejó de coincidir con el alumno elegido, el nombre
                // que trajo el padrón ya no corresponde y se vuelve a dejar vacío.
                if (estado.formPasajero.nombreAutomatico
                    && codigoEscrito !== normalizarCodigoCliente(estado.formPasajero.codigoAlumno)) {
                    estado.formPasajero.nombreAutomatico = false;
                    estado.formPasajero.alumnoId = null;
                    estado.formPasajero.codigoAlumno = '';
                    estado.formPasajero.nombre = '';

                    var nombreAutomatico = $('#pasajero-nombre');
                    var alumnoOculto = $('#pasajero-alumno');
                    var ayudaPadron = $('#ayuda-pasajero');

                    if (nombreAutomatico) {
                        nombreAutomatico.value = '';
                    }

                    if (alumnoOculto) {
                        alumnoOculto.value = '';
                    }

                    if (ayudaPadron && !ayudaPadron.classList.contains('ayuda-error')) {
                        ayudaPadron.textContent = 'Escribe el nombre: ese código no está en el padrón.';
                    }
                }

                programarSugerencias('pasajero', evento.target.value);
            }

            if (evento.target.id === 'pasajero-companero') {
                programarSugerencias('companero', evento.target.value);
            }

            if (evento.target.id === 'pasajero-nombre') {
                estado.formPasajero.nombre = evento.target.value;
                estado.formPasajero.nombreAutomatico = false;
            }

            if (evento.target.id === 'pasajero-encargado') {
                estado.formPasajero.encargado = evento.target.value;
            }
        });

        document.addEventListener('change', function (evento) {
            if (evento.target.id === 'filtro-alumnos-anio') {
                estado.filtroAlumnos.anio = evento.target.value;
                render();
            }

            if (evento.target.id === 'filtro-alumnos-seccion') {
                estado.filtroAlumnos.seccion_id = evento.target.value;
                render();
            }

            if (evento.target.id === 'pasajero-con-encargado') {
                estado.formPasajero.conEncargado = evento.target.checked;
                alternarEncargado(evento.target.checked);

                // Con el campo oculto el servidor seguiría contando dos personas,
                // así que al desmarcar se borra el nombre del encargado.
                if (!evento.target.checked) {
                    estado.formPasajero.encargado = '';

                    var encargadoCampo = $('#pasajero-encargado');

                    if (encargadoCampo) {
                        encargadoCampo.value = '';
                    }
                }
            }

            if (evento.target.id === 'pago-pasajero') {
                actualizarDetallePago();
            }
        });

        $('#modal-cerrar').addEventListener('click', cerrarModal);

        $('#capa-modal').addEventListener('click', function (evento) {
            if (evento.target === evento.currentTarget) {
                cerrarModal();
            }
        });

        $('#seleccion-cerrar').addEventListener('click', cerrarSelector);

        $('#capa-seleccion').addEventListener('click', function (evento) {
            if (evento.target === evento.currentTarget) {
                cerrarSelector();
            }
        });

        document.addEventListener('keydown', function (evento) {
            var idCampo = evento.target ? evento.target.id : '';

            if (idCampo === 'pasajero-codigo' || idCampo === 'pasajero-companero') {
                var capaSugerencias = document.getElementById(
                    idCampo === 'pasajero-companero' ? 'sugerencias-companero' : 'sugerencias-pasajero'
                );

                if (moverSugerencia(evento, capaSugerencias)) {
                    return;
                }
            }

            if (idCampo === 'pasajero-companero') {
                // Enter o coma convierten lo escrito en un chip.
                if ((evento.key === 'Enter' || evento.key === ',') && evento.target.value.trim() !== '') {
                    evento.preventDefault();
                    agregarCompanero(evento.target.value);
                    return;
                }

                // Borrar con el campo vacío quita al último compañero.
                if (evento.key === 'Backspace' && evento.target.value === '') {
                    var codigosCompaneros = estado.formPasajero.companeros || [];

                    if (codigosCompaneros.length) {
                        quitarCompanero(codigosCompaneros[codigosCompaneros.length - 1]);
                        return;
                    }
                }
            }

            if (evento.key !== 'Escape') {
                return;
            }

            if (selectorAbierto()) {
                cerrarSelector();
                return;
            }

            if (!$('#capa-modal').hidden) {
                cerrarModal();
                return;
            }

            if (estado.asientoSeleccionado) {
                estado.asientoSeleccionado = null;
                render();
            }
        });

        document.addEventListener('dragstart', function (evento) {
            var origen = evento.target.closest('.butaca.ocupada, .abordaje-fila');

            if (!origen) {
                return;
            }

            asientoArrastrado = {
                pasajero_id: Number(origen.getAttribute('data-pasajero-id')),
                tipo: origen.getAttribute('data-rol') || 'estudiante'
            };
            origen.classList.add('arrastrando');

            if (evento.dataTransfer) {
                evento.dataTransfer.effectAllowed = 'move';
                evento.dataTransfer.setData('text/plain', String(asientoArrastrado.pasajero_id));
            }
        });

        document.addEventListener('dragend', function (evento) {
            var origen = evento.target.closest('.butaca.ocupada, .abordaje-fila');

            if (origen) {
                origen.classList.remove('arrastrando');
            }

            $$('.butaca.destino').forEach(function (butaca) {
                butaca.classList.remove('destino');
            });

            asientoArrastrado = null;
        });

        document.addEventListener('mouseover', function (evento) {
            var destino = evento.target.closest('.butaca.libre');

            if (!destino || !estado.asientoSeleccionado) {
                return;
            }

            destino.classList.add('destino');
        });

        document.addEventListener('mouseout', function (evento) {
            var destino = evento.target.closest('.butaca.libre');

            if (destino) {
                destino.classList.remove('destino');
            }
        });

        document.addEventListener('dragover', function (evento) {
            var destino = evento.target.closest('.butaca.libre');

            if (!destino || !asientoArrastrado) {
                return;
            }

            evento.preventDefault();
            destino.classList.add('destino');

            if (evento.dataTransfer) {
                evento.dataTransfer.dropEffect = 'move';
            }
        });

        document.addEventListener('dragleave', function (evento) {
            var destino = evento.target.closest('.butaca.libre');

            if (destino) {
                destino.classList.remove('destino');
            }
        });

        document.addEventListener('drop', function (evento) {
            var destino = evento.target.closest('.butaca.libre');

            if (!destino || !asientoArrastrado) {
                return;
            }

            evento.preventDefault();
            moverAsiento(asientoArrastrado.pasajero_id, asientoArrastrado.tipo, Number(destino.getAttribute('data-asiento')));
        });

        marcarFechaEnVivo();
        actualizarTemporizador();

        window.setInterval(function () {
            marcarFechaEnVivo();
            actualizarTemporizador();
            revisarCierreAutomatico();
        }, 1000);

        cargarPanel();
        cargarProfesores(false);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
