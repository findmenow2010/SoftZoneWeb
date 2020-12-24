using System;

namespace SoftZone_WebSite.Models
{
    public class ContactUs
    {
        public int ID { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Mobile { get; set; }
        public string Subject { get; set; }
        public string Message { get; set; }
        public DateTime Date { get; set; }
        public long mail_id { get; set; }
    }
}
