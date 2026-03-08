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
    public class IzvestajController : ControllerBase
    {
        [HttpPost]
        public IActionResult Post([FromBody] System.Text.Json.JsonElement i)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();

                // React šalje mala slova: opis, terminId, ukupnaCena
                string opis = i.GetProperty("opis").GetString();
                int tId = i.GetProperty("terminId").GetInt32();
                decimal cena = i.GetProperty("ukupnaCena").GetDecimal();

                var parametri = new List<SqlParameter> {
                    new SqlParameter("@opis", opis),
                    new SqlParameter("@terminId", tId),
                    new SqlParameter("@ukupnaCena", cena)
                };

                Broker.Instance().IzvrsiProceduru("Izvestaj_Insert", parametri);

                // Automatsko ažuriranje statusa nakon izveštaja
                var parametriStatus = new List<SqlParameter> {
                    new SqlParameter("@id", tId),
                    new SqlParameter("@status", "Završeno")
                };
                Broker.Instance().IzvrsiProceduru("Termin_UpdateStatus", parametriStatus);

                return Ok(new { poruka = "Izveštaj uspešno sačuvan!" });
            }
            catch (Exception ex)
            {
                return BadRequest("Greška: " + ex.Message);
            }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                // Ako Izvestaj_Select ne prima parametre, šaljemo null
                DataTable dt = Broker.Instance().IzvrsiUpitProcedura("Izvestaj_Select", null);

                var lista = new List<Dictionary<string, object>>();
                foreach (DataRow row in dt.Rows)
                {
                    var dict = new Dictionary<string, object>();
                    foreach (DataColumn col in dt.Columns) { dict[col.ColumnName] = row[col]; }
                    lista.Add(dict);
                }
                return Ok(lista);
            }
            catch (Exception ex) { return BadRequest("Greška: " + ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPut("{id}")]
        public IActionResult Put(int id, [FromBody] System.Text.Json.JsonElement i)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> {
                    new SqlParameter("@id", id),
                    new SqlParameter("@opis", i.GetProperty("opis").GetString()),
                    new SqlParameter("@ukupnaCena", i.GetProperty("ukupnaCena").GetDecimal())
                };

                Broker.Instance().IzvrsiProceduru("Izvestaj_Update", parametri);
                return Ok("Izveštaj je uspešno izmenjen.");
            }
            catch (Exception ex) { return BadRequest("Greška: " + ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> { new SqlParameter("@id", id) };
                Broker.Instance().IzvrsiProceduru("Izvestaj_Delete", parametri);
                return Ok("Izveštaj je uspešno obrisan.");
            }
            catch (Exception ex) { return BadRequest("Greška: " + ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }
    }
}