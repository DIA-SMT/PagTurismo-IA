import { definir } from "../definir";

/** Módulo de buses: títulos de las páginas y avisos. Los textos internos del bus están en lib/buses/tourist-copy.ts (es/en). */
export const buses = definir({
  es: {
    turistico: {
      titulo: "Bus Turístico",
      descripcion: "Reservá tu lugar en los circuitos del Bus Turístico de San Miguel de Tucumán: salidas programadas, cupos reales y reserva gratuita.",
    },
    educativo: {
      titulo: "Bus Educativo",
      descripcion: "Turnos institucionales para que escuelas e instituciones recorran San Miguel de Tucumán en el Bus Turístico Educativo.",
    },
    reserva: { titulo: "Mi reserva" },
    galeria: {
      titulo: "Fotos de los recorridos",
      descripcion: "Las fotos de cada salida del Bus Turístico, disponibles durante 7 días.",
    },
    noDisponible: {
      titulo: "Las reservas no están disponibles en este momento",
      texto: "Estamos terminando de conectar el sistema de reservas. Mientras tanto, consultá en la Oficina de Informes Turísticos o escribí a turismo@smt.gob.ar.",
    },
    soloEspanol: "Esta sección está disponible solo en español por ahora.",
    proximasSalidas: "Próximas salidas",
    lugares: "{n} lugares",
    ultimoLugar: "Último lugar",
    completa: "Completa",
    reservar: "Reservar",
    verSalidas: "Ver salidas y reservar",
    sinSalidas: "No hay salidas publicadas por ahora.",
  },
  en: {
    turistico: {
      titulo: "Tourist Bus",
      descripcion: "Book your seat on the San Miguel de Tucumán Tourist Bus tours: scheduled departures, real availability and free booking.",
    },
    educativo: {
      titulo: "School Bus",
      descripcion: "Institutional slots for schools to tour San Miguel de Tucumán on the Educational Tourist Bus.",
    },
    reserva: { titulo: "My booking" },
    galeria: {
      titulo: "Tour photos",
      descripcion: "Photos from each Tourist Bus departure, available for 7 days.",
    },
    noDisponible: {
      titulo: "Bookings are not available right now",
      texto: "We are finishing connecting the booking system. Meanwhile, ask at the Tourist Information Office or write to turismo@smt.gob.ar.",
    },
    soloEspanol: "This section is only available in Spanish for now.",
    proximasSalidas: "Upcoming departures",
    lugares: "{n} seats",
    ultimoLugar: "Last seat",
    completa: "Full",
    reservar: "Book",
    verSalidas: "See departures and book",
    sinSalidas: "No departures published yet.",
  },
  pt: {
    turistico: {
      titulo: "Ônibus Turístico",
      descripcion: "Reserve seu lugar nos circuitos do Ônibus Turístico de San Miguel de Tucumán: saídas programadas, vagas reais e reserva gratuita.",
    },
    educativo: {
      titulo: "Ônibus Escolar",
      descripcion: "Horários institucionais para escolas percorrerem San Miguel de Tucumán no Ônibus Turístico Educativo.",
    },
    reserva: { titulo: "Minha reserva" },
    galeria: {
      titulo: "Fotos dos passeios",
      descripcion: "As fotos de cada saída do Ônibus Turístico, disponíveis por 7 dias.",
    },
    noDisponible: {
      titulo: "As reservas não estão disponíveis no momento",
      texto: "Estamos terminando de conectar o sistema de reservas. Enquanto isso, consulte o Escritório de Informações Turísticas ou escreva para turismo@smt.gob.ar.",
    },
    soloEspanol: "Esta seção ainda está disponível apenas em espanhol.",
    proximasSalidas: "Próximas saídas",
    lugares: "{n} lugares",
    ultimoLugar: "Último lugar",
    completa: "Lotada",
    reservar: "Reservar",
    verSalidas: "Ver saídas e reservar",
    sinSalidas: "Ainda não há saídas publicadas.",
  },
});
