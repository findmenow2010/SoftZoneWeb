using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SoftZone_WebSite.Models;
using SoftZone_WebSite.Repository.Interface;
using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace SoftZone_WebSite.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly INewsLetter_SubscriberRepository newsLetter_SubscriberRepository;
        private readonly IEmailService _emailService;
        private readonly IContactUsRepositoryAsync ContactUsrepo;

        public HomeController(ILogger<HomeController> logger, INewsLetter_SubscriberRepository newsLetter_SubscriberRepository,
            IEmailService emailService,IContactUsRepositoryAsync _ContactUsrepo)
        {
            _logger = logger;
            this.newsLetter_SubscriberRepository = newsLetter_SubscriberRepository ?? throw new ArgumentNullException(nameof(newsLetter_SubscriberRepository));
            this._emailService = emailService;
            ContactUsrepo = _ContactUsrepo ?? throw new ArgumentNullException(nameof(_ContactUsrepo));
        }

        public IActionResult Index()
        {
            return View();
        }
        public IActionResult About()
        {
            return View();
        }
        public IActionResult MissionVision()
        {
            return View();
        }
        public IActionResult Blog()
        {
            return View();
        }
        public IActionResult Projects()
        {
            return View();
        }
        public IActionResult FAQ()
        {
            return View();
        }
        public IActionResult Testimonials()
        {
            return View();
        }
        public IActionResult Contact()
        {
            return View();
        }
        public IActionResult Services()
        {
            return View();
        }

        [HttpPost]

        public async Task<IActionResult> News_Letter_Subscribe(string Email)
        {
            if (!string.IsNullOrWhiteSpace(Email))
            {
                if (await newsLetter_SubscriberRepository.SubscribedBefore(Email)) {
                    return Ok("Email already exists");
                }
                newsLetter_SubscriberRepository.Add(new NewsLetterSubscriber {Email = Email });
                var res = await newsLetter_SubscriberRepository.SaveChanges();
                if (res > 0)
                {
                    return Ok("Subscribed Successfully..");
                }
                else { return Ok("Error occured please try again later."); }
            }
            else return Ok("Validate your Email.");
        }

        [HttpPost]
        public  IActionResult ContactUs(string username,string email,string phone,string website, string message)
        {
            //_emailService.Send(email, "info@soft-zone.net", string.Format("{0}-{1}-{2}-{3}", username, email, phone, website), message);
             ContactUsrepo.SaveContact(new ContactUs { ID=0, Date= DateTime.Now, Email = email, mail_id = 0, Message=message, Mobile= phone, Name=username, Subject=website });
            return View("Contact");
        }


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }



    }



}
