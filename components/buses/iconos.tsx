/**
 * Íconos del módulo de buses. El código portado de BotTurismo usaba lucide-react; para no sumar un
 * segundo sistema de íconos (y otra dependencia), estos componentes tienen los mismos nombres y
 * dibujan el ícono equivalente del sprite del portal (components/Iconos.tsx).
 */
import type { CSSProperties } from "react";

import { Icono } from "@/components/Iconos";

type Props = { size?: number | string; className?: string; style?: CSSProperties; "aria-hidden"?: boolean | "true" | "false"; strokeWidth?: number };

function crear(nombre: string, giro = 0) {
  function Componente({ size = 20, className, style }: Props) {
    const tamano = typeof size === "number" ? size : parseInt(size, 10) || 20;
    return (
      <span className={className} style={{ display: "inline-flex", flex: "none", ...(giro ? { transform: `rotate(${giro}deg)` } : {}), ...style }} aria-hidden="true">
        <Icono nombre={nombre} tamano={tamano} />
      </span>
    );
  }
  Componente.displayName = nombre;
  return Componente;
}

export const Plus = crear("mas");
export const Trash2 = crear("basura");
export const Pencil = crear("lapiz");
export const Edit3 = crear("lapiz");
export const X = crear("cerrar");
export const Search = crear("buscar");
export const RefreshCw = crear("refrescar");
export const Save = crear("guardar");
export const Download = crear("descarga");
export const Upload = crear("subir");
export const Copy = crear("copiar");
export const ChevronDown = crear("chevron");
export const ChevronUp = crear("chevron", 180);
export const ChevronRight = crear("chevron", -90);
export const ChevronLeft = crear("chevron", 90);
export const Check = crear("check");
export const CheckCircle2 = crear("check");
export const Ban = crear("prohibido");
export const Users = crear("personas");
export const UsersRound = crear("personas");
export const TrendingUp = crear("tendencia");
export const ToggleRight = crear("interruptor-si");
export const ToggleLeft = crear("interruptor-no");
export const Sparkles = crear("chispas");
export const SlidersHorizontal = crear("ajustes");
export const Settings = crear("ajustes");
export const QrCode = crear("qr");
export const Play = crear("play");
export const MessageSquare = crear("chat");
export const MessageCircle = crear("chat");
export const Mail = crear("correo");
export const List = crear("lista");
export const Languages = crear("idioma");
export const Landmark = crear("estatua");
export const ImagePlus = crear("camara");
export const Globe = crear("globo");
export const Filter = crear("filtro");
export const Eye = crear("ojo");
export const ExternalLink = crear("externo");
export const CalendarDays = crear("calendario");
export const Bus = crear("bus-linea");
export const Bike = crear("bici");
export const ArrowUp = crear("arriba");
export const ArrowDown = crear("abajo");
export const ArrowLeft = crear("flecha-izq");
export const ArrowRight = crear("flecha");
export const MapPin = crear("ubicacion");
export const Clock = crear("reloj");
export const Info = crear("info");
export const AlertTriangle = crear("alerta");
export const Camera = crear("camara");
export const Phone = crear("telefono");
export const Ticket = crear("ticket");
export const Loader2 = crear("refrescar");
export const Church = crear("estatua");
export const Footprints = crear("caminata");
export const Lightbulb = crear("chispas");
export const Moon = crear("luna");
export const Music = crear("chispas");
export const Sandwich = crear("plato");
export const UtensilsCrossed = crear("plato");
export const Images = crear("camara");
export const Home = crear("flecha-izq");
