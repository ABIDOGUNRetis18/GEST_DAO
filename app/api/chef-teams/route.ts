import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const connection = await db();

    const { searchParams } = new URL(req.url);
    const chefId = searchParams.get("chefId");

    if (!chefId) {
      return NextResponse.json(
        { success: false, message: "chefId requis" },
        { status: 400 },
      );
    }

    const [rows]: any = await connection.execute(
      `
      SELECT
        d.id AS dao_id,
        d.numero,
        d.objet,
        d.team_id,
        chef.username AS chef_name,
        tm.user_id AS member_id,
        member.username AS member_name
      FROM daos d
      LEFT JOIN users chef ON d.chef_id = chef.id
      LEFT JOIN team_members tm ON d.team_id = tm.team_id
      LEFT JOIN users member ON tm.user_id = member.id
      WHERE d.chef_id = ?
      ORDER BY d.created_at DESC
    `,
      [Number(chefId)],
    );

    const teamsByDao: Record<
      number,
      {
        daoId: number;
        numero: string;
        objet: string | null;
        chefName: string | null;
        members: { id: number; name: string }[];
      }
    > = {};

    for (const row of rows || []) {
      const daoId = Number(row.dao_id);
      if (!teamsByDao[daoId]) {
        teamsByDao[daoId] = {
          daoId,
          numero: String(row.numero),
          objet: row.objet ? String(row.objet) : null,
          chefName: row.chef_name ? String(row.chef_name) : null,
          members: [],
        };
      }

      if (row.member_id && row.member_name) {
        teamsByDao[daoId].members.push({
          id: Number(row.member_id),
          name: String(row.member_name),
        });
      }
    }

    const data = Object.values(teamsByDao);

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("API /api/chef-teams GET error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 },
    );
  }
}
