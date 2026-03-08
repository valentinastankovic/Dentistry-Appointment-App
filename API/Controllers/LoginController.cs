using Microsoft.AspNetCore.Mvc;
using BazaPodataka;
using System.Data;
using Microsoft.Data.SqlClient;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoginController : ControllerBase
    {
        [HttpPost]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            try
            {
                // Hardkodovani admin ostaje ovde (to je OK za ovaj nivo)
                if (request.Email == "admin@dentify.com" && request.Password == "admin123")
                {
                    return Ok(new { Role = "Admin", Token = "admin-token", Ime = "Administrator" });
                }

                Broker.Instance().OtvoriKonekciju();

                // SKLONJEN SQL KOD - Sada samo šaljemo parametre proceduri
                var parametri = new List<SqlParameter> {
                    new SqlParameter("@email", request.Email),
                    new SqlParameter("@pass", request.Password)
                };

                // Pozivamo proceduru umesto pisanja SELECT upita
                DataTable dt = Broker.Instance().IzvrsiUpitProcedura("Korisnik_Login", parametri);

                if (dt != null && dt.Rows.Count > 0)
                {
                    DataRow row = dt.Rows[0];
                    string uloga = row["uloga"].ToString();

                    return Ok(new
                    {
                        Id = row["id"],
                        Ime = row["ime"].ToString(),
                        Role = uloga,
                        Token = uloga.ToLower() + "-token-secret"
                    });
                }

                return Unauthorized("Pogrešan email ili lozinka!");
            }
            catch (Exception ex)
            {
                return BadRequest("Greška pri prijavi: " + ex.Message);
            }
            finally
            {
                Broker.Instance().ZatvoriKonekciju();
            }
        }
    }

    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }
}