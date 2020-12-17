using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoftZone_WebSite.Repository.Interface
{
    public interface IGenericRepository<T>
    {
        Task<IReadOnlyList<T>> GetAll();
        Task<T> GetByID(long Id);
        void Add(T entity);
        void Update(T entity);
        void Delete(T entity);
        Task<bool> Exists(T entity);
        Task<int> SaveChanges();
    }
}
