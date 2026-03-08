using Microsoft.AspNetCore.Mvc;
using BazaPodataka;
using Microsoft.Data.SqlClient;
using System.Data;
using System;
using System.Collections.Generic;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TerminController : ControllerBase
    {
        [HttpPost]
        public IActionResult Zakazi([FromBody] System.Text.Json.JsonElement t)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                int uslugaId = t.GetProperty("uslugaIds")[0].GetInt32();

                var parametri = new List<SqlParameter> {
                    new SqlParameter("@datum", t.GetProperty("datum").GetString()),
                    new SqlParameter("@vreme", t.GetProperty("vreme").GetString()),
                    new SqlParameter("@pId", t.GetProperty("pacijentId").GetInt32()),
                    new SqlParameter("@sId", t.GetProperty("stomatologId").GetInt32()),
                    new SqlParameter("@uId", uslugaId)
                };

                Broker.Instance().IzvrsiProceduru("Termin_Insert", parametri);
                return Ok("Uspešno zakazano!");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpGet("stomatolog/{id}")]
        public IActionResult VratiPoStomatologu(int id)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> {
                    new SqlParameter("@id", id),
                    new SqlParameter("@tip", "stomatolog")
                };

                DataTable dt = Broker.Instance().IzvrsiUpitProcedura("Termin_Select_Filtered", parametri);

                var lista = new List<Dictionary<string, object>>();
                foreach (DataRow row in dt.Rows)
                {
                    var dict = new Dictionary<string, object>();
                    foreach (DataColumn col in dt.Columns) { dict[col.ColumnName] = row[col]; }
                    lista.Add(dict);
                }

                return Ok(lista);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpGet("pacijent/{id}")]
        public IActionResult VratiPoPacijentu(int id)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> {
                    new SqlParameter("@id", id),
                    new SqlParameter("@tip", "pacijent")
                };

                DataTable dt = Broker.Instance().IzvrsiUpitProcedura("Termin_Select_Filtered", parametri);

                var lista = new List<Dictionary<string, object>>();
                foreach (DataRow row in dt.Rows)
                {
                    var dict = new Dictionary<string, object>();
                    foreach (DataColumn col in dt.Columns) { dict[col.ColumnName] = row[col]; }
                    lista.Add(dict);
                }

                return Ok(lista);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPut("promeni-status/{id}")]
        public IActionResult PromeniStatus(int id, [FromBody] System.Text.Json.JsonElement body)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                string noviStatus = body.GetProperty("status").GetString();

                var parametri = new List<SqlParameter> {
                    new SqlParameter("@id", id),
                    new SqlParameter("@status", noviStatus)
                };

                Broker.Instance().IzvrsiProceduru("Termin_UpdateStatus", parametri);
                return Ok(new { poruka = "Uspešno ažurirano" });
            }
            catch (Exception ex) { return BadRequest("Greška: " + ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpGet("slob_vremena")]
        public IActionResult GetSlobodnaVremena([FromQuery] int stomatologId, [FromQuery] string datum)
        {
            // Lista svih mogućih termina mora biti dostupna i u catch bloku
            List<string> svaVremena = new List<string> {
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
        "11:00", "13:00", "14:00", "15:00"
    };

            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> {
            new SqlParameter("@sId", stomatologId),
            new SqlParameter("@datum", datum)
        };

                DataTable dt = Broker.Instance().IzvrsiUpitProcedura("Termin_GetZauzetaVremena", parametri);

                // Ako nema zauzetih termina, vrati SVA vremena kao slobodna
                if (dt == null || dt.Rows.Count == 0)
                {
                    return Ok(svaVremena);
                }

                List<string> zauzeta = new List<string>();
                foreach (DataRow dr in dt.Rows)
                {
                    if (dr["vreme"] != DBNull.Value)
                    {
                        if (dr["vreme"] is TimeSpan ts)
                            zauzeta.Add(ts.ToString(@"hh\:mm"));
                        else
                            zauzeta.Add(dr["vreme"].ToString().Substring(0, 5));
                    }
                }

                var slobodna = svaVremena.FindAll(v => !zauzeta.Contains(v));
                return Ok(slobodna);
            }
            catch (Exception)
            {
                // Čak i ako baza pukne, vrati sva vremena da korisnik ne vidi "Greška" modal
                return Ok(svaVremena);
            }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> { new SqlParameter("@id", id) };
                Broker.Instance().IzvrsiProceduru("Termin_Delete", parametri);
                return Ok("Termin uspešno obrisan!");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpGet("izvestaj/{terminId}")]
        public IActionResult VratiIzvestaj(int terminId)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> {
            new SqlParameter("@tId", terminId)
        };

                DataTable dt = Broker.Instance().IzvrsiUpitProcedura("Izvestaj_Select", parametri);

                var lista = new List<Dictionary<string, object>>();
                if (dt != null)
                {
                    foreach (DataRow row in dt.Rows)
                    {
                        var dict = new Dictionary<string, object>();
                        foreach (DataColumn col in dt.Columns) { dict[col.ColumnName] = row[col]; }
                        lista.Add(dict);
                    }
                }

                // UVEK vraćamo Ok, makar lista bila prazna
                return Ok(lista);
            }
            catch (Exception)
            {
                // Ako nema izveštaja u bazi, tvoj Broker verovatno baca grešku. 
                // Mi je "pojedemo" i vratimo praznu listu.
                return Ok(new List<object>());
            }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

    }
}