namespace SoftZone_WebSite.Repository.Interface
{
    public interface IEmailService
    {
        void Send(string from, string to, string subject, string html);
    }
}
