using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace SoftZone_WebSite.Models
{
    [Table("tb_NewsLetter_Subscribers")]
    public class NewsLetterSubscriber
    {
        [Key]
        public long Id { get; set; }
        [Required(ErrorMessage ="Email required"),MaxLength(250)]
        public string Email { get; set; }
    }
}
