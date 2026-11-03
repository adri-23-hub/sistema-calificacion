import { NextResponse } from "next/server";
import { getLiveResults } from "@/lib/live-results";
import type { LiveResultsApiResponse } from "@/features/live/types";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

/**
 * Endpoint público de resultados en vivo.
 * No requiere autenticación y no expone notas individuales por jurado.
 */
export async function GET() {
  try {
    const data = await getLiveResults();

    if (!data) {
      const response: LiveResultsApiResponse = {
        success: false,
        error: "No se encontró ninguna edición activa del certamen.",
      };
      return NextResponse.json(response, {
        status: 404,
        headers: NO_STORE_HEADERS,
      });
    }

    const response: LiveResultsApiResponse = { success: true, data };
    return NextResponse.json(response, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Error al obtener resultados en vivo:", error);
    const response: LiveResultsApiResponse = {
      success: false,
      error: "No se pudieron obtener los resultados en vivo.",
    };
    return NextResponse.json(response, {
      status: 500,
      headers: NO_STORE_HEADERS,
    });
  }
}
