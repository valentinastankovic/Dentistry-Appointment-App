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
    public class UslugaController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                
                DataTable dt = Broker.Instance().IzvrsiUpitProcedura("Usluga_Select", null);

                var listaUsluga = new List<object>();
                foreach (DataRow row in dt.Rows)
                {
                    listaUsluga.Add(new
                    {
                        id = Convert.ToInt32(row["id"]),
                        naziv = row["naziv"].ToString(),
                        opis = row["opis"].ToString(),
                        cena = Convert.ToDecimal(row["cena"])
                    });
                }
                return Ok(listaUsluga);
            }
            catch (Exception ex) { return BadRequest("Greška: " + ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPost]
        public IActionResult Post([FromBody] System.Text.Json.JsonElement u)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter>
                {
                    new SqlParameter("@naziv", u.GetProperty("naziv").GetString()),
                    new SqlParameter("@opis", u.GetProperty("opis").GetString()),
                    new SqlParameter("@cena", u.GetProperty("cena").GetDecimal())
                };

                Broker.Instance().IzvrsiProceduru("Usluga_Insert", parametri);
                return Ok("Usluga uspešno dodata.");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpPut("{id}")]
        public IActionResult Put(int id, [FromBody] System.Text.Json.JsonElement u)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter>
                {
                    new SqlParameter("@id", id),
                    new SqlParameter("@naziv", u.GetProperty("naziv").GetString()),
                    new SqlParameter("@opis", u.GetProperty("opis").GetString()),
                    new SqlParameter("@cena", u.GetProperty("cena").GetDecimal())
                };

                Broker.Instance().IzvrsiProceduru("Usluga_Update", parametri);
                return Ok("Usluga uspešno izmenjena.");
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                Broker.Instance().OtvoriKonekciju();
                var parametri = new List<SqlParameter> { new SqlParameter("@id", id) };

                Broker.Instance().IzvrsiProceduru("Usluga_Delete", parametri);
                return Ok("Usluga uspešno obrisana.");
            }
            catch (Exception ex) { return BadRequest("Greška: " + ex.Message); }
            finally { Broker.Instance().ZatvoriKonekciju(); }
        }
    }
}