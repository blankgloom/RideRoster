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
        programados: [],
        historial: [],
        paseos: [],
        personal: [],
        busquedaPasajeros: '',
        busquedaPaseos: '',
        viajeModalId: null,
        viajeModal: null,
        formPasajero: { nombre: '', codigo: '', encargado: '', amigo: '', conEncargado: false },
        advertenciaCodigo: null,
        desborde: null,
        salida: null,
        nuevosNombres: [],
        filtroPaseos: ''
    };

    var asientoArrastrado = null;

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
        return fecha.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

    function render() {
        var contenedor = $('#contenido');
        contenedor.innerHTML = estado.vista === 'inicio' ? vistaInicio() : vistaAdministracion();
        actualizarEstadoSistema();
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

    function metricasViaje(viaje) {
        if (!viaje) {
            return '';
        }

        return [
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
                detalle: 'docentes y comandos de salvamento',
                icono: ICONOS.docente,
                clase: 'ambar'
            }
        ].map(function (metrica) {
            return '<article class="metrica">' +
                '<div class="metrica-cabecera"><span class="metrica-etiqueta">' + escapar(metrica.etiqueta) + '</span>' +
                '<span class="metrica-icono ' + (metrica.clase || '') + '">' + icono(metrica.icono) + '</span></div>' +
                '<div class="metrica-valor numero">' + escapar(metrica.valor) + '</div>' +
                '<div class="metrica-detalle">' + escapar(metrica.detalle) + '</div>' +
                '</article>';
        }).join('');
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

        var html = '<div class="mapa-bus">' +
            '<div class="frente-bus">' +
            '<span class="frente-volante">Volante</span>' +
            '<span class="butaca-personal">Docente</span>' +
            '<span class="butaca-personal">Salvamento</span>' +
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
            '<span class="leyenda-nota">Haz clic en una persona y luego en el asiento de destino, o arrástrala.</span>' +
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

        return '<section class="tarjeta con-margen-inferior">' +
            '<div class="tarjeta-cabecera"><div><h2>Asignación de asientos</h2>' +
            '<p>Selecciona un estudiante y elige el asiento exacto que ocupará, o arrástralo hasta la butaca. Con <strong>Cerrar huecos</strong> el bus vuelve a quedar lleno de forma continua.</p></div>' +
            '<div class="acciones-vista">' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="compactar-asientos" title="Rellena los asientos vacíos intermedios">Cerrar huecos</button>' +
            '<button type="button" class="boton boton-secundario boton-pequeno" data-accion="generar-listado">Generar listado</button>' +
            '<a class="boton boton-borde boton-pequeno" href="listado.php?viaje=' + viaje.id + '" target="_blank" rel="noopener">Exportar PDF</a>' +
            '</div></div>' +
            '<div class="tarjeta-cuerpo"><div class="rejilla-asientos">' +
            '<div>' + renderMapaAsientos() + '</div>' +
            renderListadoAbordaje() +
            '</div></div></section>';
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
                '<span class="metrica-etiqueta">Viaje actual</span>' + estadoPastilla(viaje.estado) + '</div>' +
                '<h2>' + escapar(viaje.nombre) + '</h2>' +
                '<p class="destino">' + escapar(viaje.destino) + '</p>' +
                '</div>' +
                '<div class="viaje-destacado-acciones">' +
                '<button type="button" class="boton boton-primario" data-accion="gestionar-viaje" data-id="' + viaje.id + '">Gestionar viaje</button>' +
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
                (pasajero.duplicado ? '<span class="pastilla error sin-punto linea">Código repetido</span>' : '') +
                (pasajero.amigo_codigo ? '<span class="celda-secundaria">Se sienta con ' + escapar(pasajero.amigo_codigo) + '</span>' : '') + '</td>' +
                '<td class="numero celda-codigo">' + escapar(pasajero.codigo) + '</td>' +
                '<td>' + (pasajero.encargado ? escapar(pasajero.encargado) : '<span class="sin-dato">Sin encargado</span>') + '</td>' +
                '<td class="columna-media numero">' + dinero(pasajero.costo) +
                (pasajero.encargado ? '<span class="celda-secundaria">incluye encargado</span>' : '') + '</td>' +
                '<td class="columna-media numero">' + dinero(pasajero.pagado) + '</td>' +
                '<td class="columna-acciones"><button type="button" class="boton-icono peligro" data-accion="quitar-pasajero" data-id="' + pasajero.id + '" data-viaje="' + viaje.id + '" title="Retirar del viaje">' + icono(ICONOS.bote) + '</button></td>' +
                '</tr>';
        }).join('') : '<tr><td colspan="7"><div class="estado-vacio"><strong>Sin estudiantes</strong><p>Agrega a los primeros estudiantes desde el botón Gestionar viaje.</p></div></td></tr>';

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
                (viaje.equipo_salvamento.length ? viaje.equipo_salvamento.map(function (persona) {
                    return '<li><span class="inicial-persona">' + iniciales(persona.nombre) + '</span><span class="persona-datos"><span class="persona-nombre">' + escapar(persona.nombre) + '</span><span class="persona-puesto">' + escapar(persona.puesto || 'Salvamento') + '</span></span></li>';
                }).join('') : '<li><span class="celda-secundaria sin-margen">Sin comandos de salvamento asignados</span></li>') +
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
            '<input type="search" class="control" id="busqueda-pasajeros" placeholder="Buscar por nombre, código o encargado" value="' + escapar(estado.busquedaPasajeros) + '"></div></div></div>' +
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

    function vistaAdministracion() {
        var parametros = estado.parametros;

        var filasPaseos = estado.paseos.length ? estado.paseos.map(function (paseo) {
            var nombres = paseo.equipo_salvamento.map(function (persona) { return persona.nombre; });
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
                '<span class="persona-puesto">' + escapar(persona.puesto || 'Salvamento') + '</span></span>' +
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
            '<th>Paseo</th><th class="col-derecha">Costo</th><th>Profesor a cargo</th><th>Salvamento</th><th></th>' +
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
            '<div class="parametro-fila"><div><p class="celda-principal">Capacidad del autobús</p><p class="descripcion">Asientos totales, incluyendo al profesor y al comando de salvamento.</p></div>' +
            '<div class="parametro-valor"><input type="number" class="control numero" id="parametro-capacidad" min="1" value="' + parametros.capacidad_bus + '">' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="guardar-capacidad">Guardar</button></div></div>' +
            '<div class="parametro-fila"><div><p class="celda-principal">Asientos de personal</p><p class="descripcion">Se descuentan de la capacidad para los estudiantes.</p></div>' +
            '<div class="parametro-valor"><input type="number" class="control numero" id="parametro-personal" min="1" value="' + parametros.asientos_personal + '">' +
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="guardar-personal">Guardar</button></div></div>' +
            '<div class="parametro-fila"><div><p class="celda-principal">Orden de los pasajeros</p><p class="descripcion">Las listas se muestran según se va agregando cada estudiante.</p></div>' +
            '<div class="parametro-valor"><span class="parametro-fijo">Orden de inscripción</span></div></div>' +
            '</div></div></section>' +
            '<section class="tarjeta">' +
            '<div class="tarjeta-cabecera"><h3>Personal de salvamento</h3></div>' +
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

    function abrirModalViaje(viajeId) {
        estado.viajeModalId = viajeId;
        estado.formPasajero = { nombre: '', codigo: '', encargado: '', amigo: '', conEncargado: false };
        estado.advertenciaCodigo = null;

        apiGet('viajes', { id: viajeId }).then(function (respuesta) {
            estado.viajeModal = respuesta.datos;
            pintarModalViaje();
        }).catch(function (error) {
            aviso('No se pudo abrir el viaje', error.message, 'error');
        });
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
            return '<tr>' +
                '<td><span class="orden-inscripcion">' + pasajero.orden + '</span></td>' +
                '<td><span class="celda-principal">' + escapar(pasajero.nombre) + '</span>' +
                (pasajero.duplicado ? '<span class="pastilla error sin-punto linea">Código repetido</span>' : '') +
                (pasajero.amigo_codigo ? '<span class="celda-secundaria">Se sienta con ' + escapar(pasajero.amigo_codigo) + '</span>' : '') + '</td>' +
                '<td class="numero celda-codigo">' + escapar(pasajero.codigo) + '</td>' +
                '<td>' + (pasajero.encargado ? escapar(pasajero.encargado) : '<span class="sin-dato">Sin encargado</span>') + '</td>' +
                '<td class="columna-media numero">' + dinero(pasajero.costo) +
                (pasajero.encargado ? '<span class="celda-secundaria">incluye encargado</span>' : '') + '</td>' +
                '<td class="columna-media numero">' + dinero(pasajero.pagado) +
                (pasajero.pendiente > 0 ? '<span class="celda-secundaria">faltan ' + dinero(pasajero.pendiente) + '</span>' : '') + '</td>' +
                '<td class="columna-acciones"><button type="button" class="boton-icono peligro" data-accion="quitar-pasajero" data-id="' + pasajero.id + '" title="Retirar del viaje">' + icono(ICONOS.bote) + '</button></td>' +
                '</tr>';
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
            '<section class="tarjeta"><div class="tarjeta-cabecera"><div><h3>Estudiantes pasajeros</h3><p>' + viaje.pasajeros_lista.length + ' inscritos · ordenados según se agregaron</p></div></div>' +
            '<div class="tarjeta-cuerpo compacto">' + advertencia +
            '<form class="formulario" id="formulario-pasajero">' +
            '<div class="formulario dos-columnas compacto-campos">' +
            '<div class="campo"><label class="campo-etiqueta" for="pasajero-nombre">Nombre del estudiante</label>' +
            '<input type="text" class="control" id="pasajero-nombre" name="nombre" placeholder="Nombre completo" value="' + escapar(estado.formPasajero.nombre) + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="pasajero-codigo">Código</label>' +
            '<input type="text" class="control" id="pasajero-codigo" name="codigo" placeholder="Ej. 2B03" maxlength="6" value="' + escapar(estado.formPasajero.codigo) + '">' +
            '<span class="campo-ayuda">Año, sección y número de lista: 2B03</span></div>' +
            '</div>' +
            '<div class="campo"><label class="campo-etiqueta" for="pasajero-amigo">Compañero de viaje (código)</label>' +
            '<input type="text" class="control" id="pasajero-amigo" name="amigo_codigo" placeholder="Ej. 2B07" maxlength="6" value="' + escapar(estado.formPasajero.amigo) + '">' +
            '<span class="campo-ayuda">Opcional. Si lo indica, se sienta junto a ese compañero.</span></div>' +
            '<div class="campo campo-casilla"><input type="checkbox" id="pasajero-con-encargado"' + (estado.formPasajero.conEncargado ? ' checked' : '') + '>' +
            '<label for="pasajero-con-encargado">Viaja con encargado</label></div>' +
            '<p class="campo-ayuda' + (estado.formPasajero.conEncargado ? '' : ' oculto') + '" id="aviso-encargado">El encargado ocupa un asiento y suma el costo por persona del paseo.</p>' +
            '<div class="campo' + (estado.formPasajero.conEncargado ? '' : ' oculto') + '" id="campo-encargado"><label class="campo-etiqueta" for="pasajero-encargado">Nombre del encargado</label>' +
            '<input type="text" class="control" id="pasajero-encargado" name="encargado" placeholder="Nombre del encargado" value="' + escapar(estado.formPasajero.encargado) + '"></div>' +
            '<div class="grupo-botones inicio">' +
            '<button type="submit" class="boton boton-primario">' + icono(ICONOS.mas) + 'Agregar estudiante</button>' +
            '</div></form></div>' +
            '<div class="tabla-envoltura tabla-media"><table class="tabla tabla-compacta"><thead><tr>' +
            '<th class="col-orden">Orden</th><th>Estudiante</th><th>Código</th><th>Encargado</th><th class="col-derecha">Costo</th><th class="col-derecha">Pagado</th><th></th>' +
            '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
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
            '<button type="button" class="boton boton-borde boton-pequeno" data-accion="cobrar-pendientes"' +
            (viaje.pendiente > 0 ? '' : ' disabled') + '>Cobrar lo pendiente</button></div>' +
            '<div class="tarjeta-cuerpo compacto">' +
            '<form class="formulario" id="formulario-pago">' +
            '<div class="campo"><label class="campo-etiqueta" for="pago-pasajero">Estudiante</label>' +
            '<select class="control" id="pago-pasajero" name="pasajero_id">' + opcionesPasajeros + '</select>' +
            '<span class="campo-ayuda" id="pago-detalle">El pago se registra a nombre del viaje.</span></div>' +
            '<div class="formulario dos-columnas compacto-campos">' +
            '<div class="campo"><label class="campo-etiqueta" for="pago-monto">Monto</label>' +
            '<input type="number" class="control numero" id="pago-monto" name="monto" step="0.01" min="0" placeholder="0.00"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="pago-metodo">Método</label>' +
            '<select class="control" id="pago-metodo" name="metodo"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="otro">Otro</option></select></div>' +
            '</div>' +
            '<div class="campo"><label class="campo-etiqueta" for="pago-nota">Referencia</label>' +
            '<input type="text" class="control" id="pago-nota" name="nota" placeholder="Recibo o nota del pago"></div>' +
            '<div class="grupo-botones inicio">' +
            '<button type="submit" class="boton boton-secundario">Registrar pago</button>' +
            '</div></form></div>' +
            '<div class="tabla-envoltura tabla-corta"><table class="tabla tabla-compacta"><thead><tr>' +
            '<th>Estudiante</th><th class="col-derecha">Monto</th><th>Método</th><th>Fecha</th><th></th>' +
            '</tr></thead><tbody>' + pagos + '</tbody></table></div>' +
            '</section>' +
            '</div>' +
            '</div>';

        var pie = '<span class="texto-apagado nota-pequena">Orden de inscripción · ' + viaje.pasajeros_lista.length + ' estudiantes</span>' +
            '<div class="grupo-botones">' +
            '<button type="button" class="boton boton-borde" data-accion="cerrar-modal">Cerrar</button>' +
            (viaje.estado === 'finalizado'
                ? '<button type="button" class="boton boton-secundario" data-accion="cambiar-estado" data-estado="programado">Reabrir viaje</button>'
                : '<button type="button" class="boton boton-secundario" data-accion="cambiar-estado" data-estado="finalizado">Marcar como finalizado</button>') +
            '</div>';

        modal('Gestionar viaje', viaje.nombre, contenido, pie, true);
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
        var paseo = paseoId ? estado.paseos.filter(function (item) { return item.id === paseoId; })[0] : null;
        var seleccionados = paseo ? paseo.equipo_salvamento.map(function (persona) { return persona.id; }) : [];
        estado.nuevosNombres = [];

        var opciones = estado.personal.map(function (persona) {
            return '<label><input type="checkbox" name="personal" value="' + persona.id + '"' + (seleccionados.indexOf(persona.id) !== -1 ? ' checked' : '') + '>' +
                '<span>' + escapar(persona.nombre) + '</span></label>';
        }).join('');

        var contenido = '<form class="formulario" id="formulario-paseo"' + (paseo ? ' data-id="' + paseo.id + '"' : '') + '>' +
            '<div class="formulario dos-columnas">' +
            '<div class="campo"><label class="campo-etiqueta" for="paseo-nombre">Nombre del paseo</label>' +
            '<input type="text" class="control" id="paseo-nombre" name="nombre" placeholder="Ej. Paseo a Antiguo Cuscatlán" value="' + escapar(paseo ? paseo.nombre : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="paseo-destino">Destino</label>' +
            '<input type="text" class="control" id="paseo-destino" name="destino" placeholder="Dirección o punto de encuentro" value="' + escapar(paseo ? paseo.destino : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="paseo-costo">Costo por persona</label>' +
            '<input type="number" class="control numero" id="paseo-costo" name="costo_persona" step="0.01" min="0" value="' + (paseo ? paseo.costo_persona : '') + '"></div>' +
            '<div class="campo"><label class="campo-etiqueta" for="paseo-profesor">Profesor a cargo</label>' +
            '<input type="text" class="control" id="paseo-profesor" name="profesor_encargado" placeholder="Nombre del docente responsable" value="' + escapar(paseo ? paseo.profesor_encargado : '') + '"></div>' +
            '</div>' +
            '<div class="campo"><label class="campo-etiqueta" for="paseo-descripcion">Descripción</label>' +
            '<textarea class="control" id="paseo-descripcion" name="descripcion" placeholder="Actividades previstas para el paseo">' + escapar(paseo ? paseo.descripcion || '' : '') + '</textarea></div>' +
            '<div class="campo"><span class="campo-etiqueta">Personal de comandos de salvamento</span>' +
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
        var ayuda = campo.parentElement ? campo.parentElement.querySelector('.campo-ayuda') : null;

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

    function moverAsiento(pasajeroId, rol, destino, mensaje) {
        var viaje = estado.viajeDetalle;

        if (!viaje) {
            return;
        }

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
            aviso('Ubicación actualizada', mensaje || 'El estudiante se sentó en el asiento ' + destino + '.', 'exito');
        }).catch(function (error) {
            aviso('No se pudo mover', error.message, 'error');
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
        }

        if (detalle) {
            detalle.textContent = conEncargado
                ? 'Incluye el costo del estudiante y de su encargado: ' + dinero(costo) + '.'
                : 'Costo del estudiante: ' + dinero(costo) + '.';
        }
    }

    function manejarAcciones(evento) {
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

            case 'ir-administracion':
                cambiarVista('administracion');
                break;

            case 'gestionar-viaje':
                abrirModalViaje(Number(id));
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
                confirmar('Eliminar paseo', 'Se quitará el paseo del catálogo. Los viajes ya programados no se modifican.', 'Eliminar paseo', 'confirmar-eliminar-paseo', { id: Number(id) });
                break;

            case 'confirmar-eliminar-paseo':
                apiPost('paseos', {}, 'eliminar', { id: Number(id) }).then(function (respuesta) {
                    estado.paseos = respuesta.datos;
                    render();
                    aviso('Paseo eliminado', 'El paseo se retiró del catálogo.', 'exito');
                    cerrarModal();
                }).catch(function (error) {
                    aviso('No se pudo eliminar', error.message, 'error');
                });
                break;

            case 'eliminar-viaje':
                confirmar('Eliminar viaje', 'Se borrará el viaje junto con su lista de pasajeros y sus pagos.', 'Eliminar viaje', 'confirmar-eliminar-viaje', { id: Number(id) });
                break;

            case 'confirmar-eliminar-viaje':
                apiPost('viajes', {}, 'eliminar', { id: Number(id) }).then(function () {
                    aviso('Viaje eliminado', 'El viaje se retiró del sistema.', 'exito');
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
                    aviso('Falta el nombre', 'Escribe el nombre del personal de salvamento.', 'error');
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
                    amigo_codigo: formulario.amigo_codigo,
                    forzar: true
                }).then(function (respuesta) {
                    estado.viajeModal = respuesta.datos;
                    estado.advertenciaCodigo = null;
                    estado.formPasajero = { nombre: '', codigo: '', encargado: '', amigo: '', conEncargado: false };
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
                    amigo_codigo: pendiente.amigo_codigo,
                    desborde: 'auto'
                }).then(function (respuesta) {
                    estado.formPasajero = { nombre: '', codigo: '', encargado: '', amigo: '', conEncargado: false };
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
                    amigo_codigo: pendienteMovimiento.amigo_codigo,
                    viaje_destino: viajeDestinoDesborde
                }).then(function (respuesta) {
                    estado.formPasajero = { nombre: '', codigo: '', encargado: '', amigo: '', conEncargado: false };
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
                        amigo_codigo: pendienteAmpliar.amigo_codigo
                    });
                }).then(function (respuesta) {
                    estado.formPasajero = { nombre: '', codigo: '', encargado: '', amigo: '', conEncargado: false };
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
                apiPost('viajes', { estado: estadoViaje }, 'estado', { id: estado.viajeModalId }).then(function (respuesta) {
                    estado.viajeModal = respuesta.datos;
                    pintarModalViaje();
                    aviso('Estado actualizado', 'El viaje quedó como ' + (estadoViaje === 'finalizado' ? 'finalizado' : 'programado') + '.', 'exito');
                    refrescarFondo();
                }).catch(function (error) {
                    aviso('No se pudo cambiar el estado', error.message, 'error');
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

            estado.formPasajero = {
                nombre: datosPasajero.nombre,
                codigo: datosPasajero.codigo,
                encargado: datosPasajero.encargado,
                amigo: datosPasajero.amigo_codigo,
                conEncargado: datosPasajero.conEncargado
            };

            apiPost('pasajeros', {
                viaje_id: estado.viajeModalId,
                nombre: datosPasajero.nombre,
                codigo: datosPasajero.codigo,
                encargado: datosPasajero.encargado,
                amigo_codigo: datosPasajero.amigo_codigo
            }).then(function (respuesta) {
                estado.viajeModal = respuesta.datos;
                estado.advertenciaCodigo = null;
                estado.formPasajero = { nombre: '', codigo: '', encargado: '', amigo: '', conEncargado: false };
                pintarModalViaje();
                aviso('Estudiante agregado', 'El pasajero se añadió a la lista del viaje.', 'exito');
                refrescarFondo();
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
                        nombre: datosPasajero.nombre,
                        codigo: datosPasajero.codigo,
                        encargado: datosPasajero.encargado,
                        amigo_codigo: datosPasajero.amigo_codigo,
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
    }

    function cambiarVista(vista) {
        estado.vista = vista;

        Array.prototype.forEach.call($$('.pestana'), function (pestana) {
            var activa = pestana.getAttribute('data-vista') === vista;
            pestana.classList.toggle('activa', activa);
            pestana.setAttribute('aria-selected', activa ? 'true' : 'false');
        });

        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function iniciar() {
        var hoy = new Date();
        $('#fecha-hoy').textContent = hoy.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        $('#pestanas').addEventListener('click', function (evento) {
            var pestana = evento.target.closest('.pestana');

            if (pestana) {
                cambiarVista(pestana.getAttribute('data-vista'));
            }
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

            if (evento.target.id === 'pasajero-codigo') {
                estado.formPasajero.codigo = evento.target.value;
                validarFormatoCodigo(evento.target);
            }

            if (evento.target.id === 'pasajero-amigo') {
                estado.formPasajero.amigo = evento.target.value;
            }

            if (evento.target.id === 'pasajero-nombre') {
                estado.formPasajero.nombre = evento.target.value;
            }

            if (evento.target.id === 'pasajero-encargado') {
                estado.formPasajero.encargado = evento.target.value;
            }
        });

        document.addEventListener('change', function (evento) {
            if (evento.target.id === 'pasajero-con-encargado') {
                estado.formPasajero.conEncargado = evento.target.checked;
                alternarEncargado(evento.target.checked);
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

        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape' && !$('#capa-modal').hidden) {
                cerrarModal();
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

        cargarPanel();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
