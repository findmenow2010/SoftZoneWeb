using SoftZone_WebSite.Models;
using System.Threading.Tasks;

namespace SoftZone_WebSite.Repository.Interface
{
    public interface IContactUsRepositoryAsync : IGenericRepository<ContactUs>
    {
        int SaveContact(ContactUs model);
    }
}
